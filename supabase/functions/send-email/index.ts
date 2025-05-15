
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { sendEmail } from "../lib/email-sender.js";

console.log("SUPABASE_URL available:", !!Deno.env.get("SUPABASE_URL"));
console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
console.log("RESEND_API_KEY available:", !!Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS pre-flight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Parse request body
    const requestBody = await req.text();
    let requestData;
    
    try {
      requestData = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError, "Raw body:", requestBody);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { to, subject, content, isTest, signature_image, attachments, contato_id, template_id, user_id, agendamento_id, cc, bcc, contato_nome, contato_email } = requestData;

    // Log detailed request information
    console.log("Email request received:", JSON.stringify({
      to: to || contato_email,
      contato_nome,
      subject,
      contentLength: content?.length,
      isTest,
      hasAttachments: !!attachments,
      hasSignature: !!signature_image,
      attachmentsCount: Array.isArray(attachments) ? attachments.length : (attachments ? 'object' : 'none'),
      contato_id,
      template_id,
      agendamento_id
    }));
    console.log("Content preview:", content?.substring(0, 200));
    if (attachments) {
      console.log("Attachments type:", typeof attachments);
      if (typeof attachments === 'string') {
        try {
          const parsedAttachments = JSON.parse(attachments);
          console.log("Parsed attachments:", JSON.stringify(parsedAttachments).substring(0, 200));
        } catch (e) {
          console.log("Failed to parse attachments string");
        }
      } else {
        console.log("Attachments structure:", JSON.stringify(attachments).substring(0, 200));
      }
    }

    // Validate required inputs
    if (!to && !contato_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing recipient email address" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const recipient = to || contato_email;
    
    if (!subject || !content) {
      console.error("Missing required fields:", { subject, contentLength: content?.length });
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: subject or content" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user ID from the authorization header or from the request body
    let userId = user_id;
    
    if (!userId) {
      const authHeader = req.headers.get("authorization")?.split(" ")[1];
      
      if (authHeader) {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader);
        if (userError) {
          console.error("Auth error:", userError.message);
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: " + userError.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = user?.id;
      } else if (isTest) {
        // For test emails we allow without auth
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create initial envio record for tracking
    let envioId = null;
    if (userId) {
      try {
        // Create an envio record with agendamento_id field
        const insertData: any = {
          user_id: userId,
          contato_id: contato_id || null,
          template_id: template_id || null,
          status: "processando",
          data_envio: new Date().toISOString(),
        };
        
        // Only add agendamento_id if it's provided
        if (agendamento_id) {
          insertData.agendamento_id = agendamento_id;
        }
        
        const { data: envioData, error: envioError } = await supabaseAdmin
          .from("envios")
          .insert(insertData)
          .select("id")
          .single();

        if (envioError) {
          console.error("Error creating envio record:", envioError);
        } else {
          envioId = envioData.id;
          console.log("Created envio record with ID:", envioId);
        }
      } catch (err) {
        console.error("Exception creating envio record:", err);
      }
    }

    // Get user's email settings
    const { data: settingsData, error: settingsError } = userId 
      ? await supabaseAdmin
          .from("configuracoes")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null, error: null };

    if (settingsError) {
      console.error("Error fetching email settings:", settingsError);
    }

    console.log("User settings:", settingsData ? JSON.stringify({
      use_smtp: settingsData.use_smtp,
      email_smtp: settingsData.email_smtp,
      email_porta: settingsData.email_porta,
      smtp_nome: settingsData.smtp_nome,
      email_usuario: settingsData.email_usuario ? "configurado" : "não configurado",
      email_senha: settingsData.email_senha ? "configurado" : "não configurado"
    }) : "none");

    // Ensure HTML content is properly formatted
    let htmlContent = content;
    
    // Make sure the content is proper HTML
    if (!content.trim().startsWith('<!DOCTYPE html>') && !content.trim().startsWith('<html')) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6; }
              .email-content { padding: 20px; }
              .signature { margin-top: 30px; }
              img { max-width: 100%; height: auto; }
              pre, code { font-family: monospace; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="email-content">
              ${content}
              ${signature_image ? `<div class="signature"><img src="${signature_image}" alt="Assinatura" style="max-height: 80px;" /></div>` : ''}
            </div>
          </body>
        </html>
      `;
    }
    
    // Prepare email data
    const emailData = {
      to: recipient,
      subject,
      html: htmlContent,
    } as any;
    
    // Add CC and BCC if provided
    if (Array.isArray(cc) && cc.length > 0) {
      emailData.cc = cc;
    }
    
    if (Array.isArray(bcc) && bcc.length > 0) {
      emailData.bcc = bcc;
    }

    // Process attachments with improved error handling and logging
    const emailAttachments = [];
    
    if (attachments) {
      try {
        // Parse attachments if it's a string
        let parsedAttachments = attachments;
        if (typeof attachments === 'string') {
          try {
            parsedAttachments = JSON.parse(attachments);
            console.log("Successfully parsed attachments JSON string");
          } catch (parseErr) {
            console.error("Error parsing attachments JSON:", parseErr);
            console.log("Raw attachments string:", attachments.substring(0, 100) + "...");
            // Continue with original value if parsing fails
          }
        }
          
        if (Array.isArray(parsedAttachments)) {
          console.log(`Processing ${parsedAttachments.length} attachments as array`);
          
          for (const attachment of parsedAttachments) {
            if (attachment.url) {
              try {
                console.log(`Fetching attachment from URL: ${attachment.url}`);
                const response = await fetch(attachment.url);
                if (!response.ok) {
                  console.error(`Failed to fetch attachment: ${response.status}`);
                  continue;
                }
                
                const buffer = await response.arrayBuffer();
                const contentType = response.headers.get('content-type') || attachment.type || `application/${attachment.name?.split('.').pop() || 'octet-stream'}`;
                
                emailAttachments.push({
                  filename: attachment.name || attachment.filename || 'attachment.file',
                  content: new Uint8Array(buffer),
                  contentType: contentType
                });
                console.log(`Attachment processed: ${attachment.name || attachment.filename} with type ${contentType}`);
              } catch (fetchErr) {
                console.error("Error fetching attachment:", fetchErr);
              }
            } else if (attachment.content) {
              // If the content is already provided in base64 format
              console.log(`Using provided content for attachment: ${attachment.name || attachment.filename || 'unnamed'}`);
              
              const content = typeof attachment.content === 'string' ? 
                (attachment.content.includes('base64,') ? 
                  attachment.content.split('base64,')[1] : 
                  attachment.content) : 
                attachment.content;
              
              const contentType = attachment.contentType || attachment.type || `application/${attachment.name?.split('.').pop() || 'octet-stream'}`;
              
              emailAttachments.push({
                filename: attachment.name || attachment.filename || 'attachment.file',
                content: content,
                contentType: contentType
              });
            }
          }
        } else if (parsedAttachments && typeof parsedAttachments === 'object') {
          // If it's a single object
          console.log("Processing single attachment object");
          
          if (parsedAttachments.url) {
            try {
              console.log(`Fetching single attachment: ${parsedAttachments.url}`);
              const response = await fetch(parsedAttachments.url);
              if (!response.ok) {
                console.error(`Failed to fetch attachment: ${response.status}`);
              } else {
                const buffer = await response.arrayBuffer();
                const contentType = response.headers.get('content-type') || parsedAttachments.type || `application/${parsedAttachments.name?.split('.').pop() || 'octet-stream'}`;
                
                emailAttachments.push({
                  filename: parsedAttachments.name || parsedAttachments.filename || 'attachment.file',
                  content: new Uint8Array(buffer),
                  contentType: contentType
                });
              }
            } catch (fetchErr) {
              console.error("Error fetching single attachment:", fetchErr);
            }
          } else if (parsedAttachments.content) {
            console.log(`Using provided content for single attachment`);
            
            const content = typeof parsedAttachments.content === 'string' ? 
              (parsedAttachments.content.includes('base64,') ? 
                parsedAttachments.content.split('base64,')[1] : 
                parsedAttachments.content) : 
              parsedAttachments.content;
            
            const contentType = parsedAttachments.contentType || parsedAttachments.type || `application/${parsedAttachments.name?.split('.').pop() || 'octet-stream'}`;
            
            emailAttachments.push({
              filename: parsedAttachments.name || parsedAttachments.filename || 'attachment.file',
              content: content,
              contentType: contentType
            });
          }
        }
      } catch (err) {
        console.error("Error processing attachments:", err);
      }
    }

    if (emailAttachments.length > 0) {
      emailData.attachments = emailAttachments;
      console.log(`Added ${emailAttachments.length} attachments to the email`);
      // Log some details about the first attachment for debugging
      if (emailAttachments.length > 0) {
        console.log(`First attachment: ${emailAttachments[0].filename}, content type: ${emailAttachments[0].contentType}, content encoding: ${typeof emailAttachments[0].content}`);
      }
    }

    // Check if SMTP is configured and should be used
    const useSmtp = settingsData?.email_smtp && 
                    settingsData?.email_porta && 
                    settingsData?.email_usuario && 
                    settingsData?.email_senha &&
                    (settingsData?.use_smtp === undefined || settingsData?.use_smtp === true);
    
    let success = false;
    let error = null;
    let details = null;

    try {
      // Use the sendEmail function from email-sender module
      const result = await sendEmail(
        emailData,
        useSmtp,
        useSmtp ? {
          host: settingsData?.email_smtp,
          port: settingsData?.email_porta || 587,
          secure: settingsData?.smtp_seguranca === "ssl" || settingsData?.email_porta === 465,
          user: settingsData?.email_usuario,
          pass: settingsData?.email_senha,
          name: settingsData?.smtp_nome || ''
        } : null,
        Deno.env.get("RESEND_API_KEY") || "",
        settingsData?.smtp_nome || "RocketMail"
      );
      
      console.log("Email sent successfully:", result);
      success = true;
      details = result;
      
    } catch (sendError) {
      console.error("Error sending email:", sendError);
      error = sendError;
      
      // Update the envio record with error info
      if (envioId) {
        await supabaseAdmin
          .from("envios")
          .update({
            status: "erro",
            erro: sendError.message,
          })
          .eq("id", envioId);
          
        if (agendamento_id) {
          await supabaseAdmin
            .from("agendamentos")
            .update({
              status: "falha",
            })
            .eq("id", agendamento_id);
        }
      }
      
      // Always return 200 even in case of error to avoid the "Edge Function returned a non-2xx status code" error
      return new Response(
        JSON.stringify({
          success: false,
          error: sendError.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the envio record with the result
    if (envioId) {
      if (success) {
        console.log("Updated sending status to 'entregue'");
        await supabaseAdmin
          .from("envios")
          .update({
            status: "entregue",
            resposta_smtp: details?.response // Save SMTP response for debugging
          })
          .eq("id", envioId);
          
        // If this was an agendamento, update its status too
        if (agendamento_id) {
          await supabaseAdmin
            .from("agendamentos")
            .update({
              status: "enviado",
            })
            .eq("id", agendamento_id);
          console.log("Updated agendamento status to 'enviado'");
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso", 
        details: details
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error sending email:", error);
    // Always return 200 even in case of error to avoid the "Edge Function returned a non-2xx status code" error
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro inesperado ao enviar email" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
