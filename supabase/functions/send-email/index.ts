
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { sendEmail, sendEmailViaSMTP, sendEmailViaResend } from "../lib/email-sender.js";

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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { to, subject, content, isTest, signature_image, attachments, contato_id, template_id, user_id, agendamento_id, cc, bcc, contato_nome, contato_email } = await req.json();

    // Log detailed request information
    console.log("Email request received:", JSON.stringify({
      to,
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

    // Validate required inputs
    if (!to && !contato_email) {
      return new Response(
        JSON.stringify({ error: "Missing recipient email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const recipient = to || contato_email;
    
    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        if (userError) throw new Error("Unauthorized: " + userError.message);
        userId = user?.id;
      } else if (isTest) {
        // For test emails we allow without auth
      } else {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    if (settingsError && !isTest) {
      console.error("Error fetching email settings:", settingsError);
    }

    console.log("User settings:", settingsData ? JSON.stringify({
      use_smtp: settingsData.use_smtp,
      email_smtp: settingsData.email_smtp,
      email_porta: settingsData.email_porta,
      smtp_nome: settingsData.smtp_nome
    }) : "none");

    // Convert content to HTML format
    const htmlContent = content.replace(/\n/g, "<br>");
    
    // Prepare email data
    const emailData = {
      to: recipient,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div>${htmlContent}</div>
          ${signature_image ? `<div style="margin-top: 20px;"><img src="${signature_image}" alt="Assinatura" style="max-height: 60px;" /></div>` : ''}
        </div>
      `,
    } as any;
    
    // Add CC and BCC if provided
    if (Array.isArray(cc) && cc.length > 0) {
      emailData.cc = cc;
    }
    
    if (Array.isArray(bcc) && bcc.length > 0) {
      emailData.bcc = bcc;
    }

    // Process attachments
    const emailAttachments = [];
    
    if (attachments) {
      try {
        // Parse attachments if it's a string
        const parsedAttachments = typeof attachments === 'string' 
          ? JSON.parse(attachments) 
          : attachments;
          
        if (Array.isArray(parsedAttachments)) {
          console.log(`Processing ${parsedAttachments.length} attachments`);
          
          for (const attachment of parsedAttachments) {
            if (attachment.url) {
              try {
                console.log(`Fetching attachment: ${attachment.url}`);
                const response = await fetch(attachment.url);
                if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.status}`);
                
                const buffer = await response.arrayBuffer();
                emailAttachments.push({
                  filename: attachment.name || attachment.filename || 'attachment.file',
                  content: buffer
                });
                console.log(`Attachment processed: ${attachment.name || attachment.filename}`);
              } catch (fetchErr) {
                console.error("Error fetching attachment:", fetchErr);
              }
            } else if (attachment.content) {
              // If the content is already provided in base64 format
              emailAttachments.push({
                filename: attachment.name || attachment.filename || 'attachment.file',
                content: typeof attachment.content === 'string' ? 
                  (attachment.content.includes('base64,') ? 
                    attachment.content.split('base64,')[1] : 
                    attachment.content) : 
                  attachment.content,
                encoding: 'base64'
              });
              console.log(`Attachment included from content: ${attachment.name || attachment.filename}`);
            }
          }
        }
      } catch (err) {
        console.error("Error processing attachments:", err);
      }
    }

    if (emailAttachments.length > 0) {
      emailData.attachments = emailAttachments;
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
    let smtpResponse = null;

    // Try to send via SMTP if configured
    if (useSmtp) {
      try {
        console.log("Sending via SMTP:", settingsData?.email_smtp);
        
        const smtpConfig = {
          host: settingsData?.email_smtp,
          port: settingsData?.email_porta || 587,
          secure: settingsData?.smtp_seguranca === "ssl" || settingsData?.email_porta === 465,
          user: settingsData?.email_usuario,
          pass: settingsData?.email_senha,
          name: settingsData?.smtp_nome || ''
        };
        
        // Use the sendEmailViaSMTP function from the email-sender module
        const smtpResult = await sendEmailViaSMTP(smtpConfig, emailData);
        
        console.log("SMTP Email sent successfully:", smtpResult.id);
        smtpResponse = smtpResult.response;
        
        success = true;
        details = {
          transport: "smtp",
          id: smtpResult.id,
          response: smtpResult.response,
          from: smtpResult.from
        };
      } catch (smtpErr) {
        console.error("SMTP error:", smtpErr);
        error = smtpErr;
        
        console.log("SMTP failed, trying Resend as fallback...");
        
        // Use Resend as fallback if SMTP fails
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        
        if (resendApiKey) {
          try {
            // Use the sendEmailViaResend function from the email-sender module
            const resendResult = await sendEmailViaResend(
              resendApiKey,
              settingsData?.smtp_nome || "RocketMail",
              settingsData?.email_usuario,
              emailData
            );
            
            console.log("Resend Email sent successfully as fallback:", resendResult.id);
            
            success = true;
            details = {
              transport: "resend",
              id: resendResult.id,
              from: resendResult.from,
              reply_to: resendResult.reply_to,
              note: "Fallback from SMTP failure"
            };
          } catch (resendErr) {
            console.error("Resend fallback error:", resendErr);
            throw new Error(`SMTP error: ${smtpErr.message}. Resend fallback also failed: ${resendErr.message}`);
          }
        } else {
          throw new Error(`SMTP error: ${smtpErr.message}. Verifique suas configurações SMTP. Nenhuma chave Resend disponível para fallback.`);
        }
      }
    } else {
      // If SMTP is not configured, use Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendApiKey) {
        console.error("No Resend API key available");
        throw new Error("Nenhum método de envio disponível. Configure SMTP ou forneça uma chave de API Resend.");
      }
      
      try {
        console.log("Sending via Resend");
        
        // Use the sendEmailViaResend function from the email-sender module
        const resendResult = await sendEmailViaResend(
          resendApiKey,
          settingsData?.smtp_nome || "RocketMail",
          settingsData?.email_usuario,
          emailData
        );
        
        console.log("Resend Email sent:", resendResult.id);
        
        success = true;
        details = {
          transport: "resend",
          id: resendResult.id,
          from: resendResult.from,
          reply_to: resendResult.reply_to
        };
      } catch (resendErr) {
        console.error("Resend error:", resendErr);
        throw resendErr;
      }
    }

    // Update the envio record with the result
    if (envioId) {
      if (success) {
        console.log("Updated sending status to 'entregue'");
        await supabaseAdmin
          .from("envios")
          .update({
            status: "entregue",
            resposta_smtp: smtpResponse // Save SMTP response for debugging
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
      } else {
        console.log("Updated sending status to 'erro'");
        await supabaseAdmin
          .from("envios")
          .update({
            status: "erro",
            erro: error ? error.message : "Unknown error",
          })
          .eq("id", envioId);
          
        // If this was an agendamento, update its status too
        if (agendamento_id) {
          await supabaseAdmin
            .from("agendamentos")
            .update({
              status: "falha",
            })
            .eq("id", agendamento_id);
          console.log("Updated agendamento status to 'falha'");
        }
      }
    }

    if (success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email enviado com sucesso", 
          details: details
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: error ? error.message : "Failed to send email",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
