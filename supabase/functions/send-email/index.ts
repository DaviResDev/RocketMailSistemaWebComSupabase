
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { Resend } from "https://esm.sh/resend@0.15.3";
import nodemailer from "https://esm.sh/nodemailer@6.9.1";

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
    const { to, subject, content, isTest, signature_image, attachments } = await req.json();

    // Validate required inputs
    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user ID from the authorization header
    const authHeader = req.headers.get("authorization")?.split(" ")[1];
    let userId;

    if (authHeader) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader);
      if (userError) throw new Error("Unauthorized: " + userError.message);
      userId = user?.id;
    } else if (isTest) {
      // For test emails we allow without auth, but would need to verify recipient is own email
      // For now we simplify by just allowing test emails without auth
    } else {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create initial envio record for tracking
    let envioId = null;
    if (userId) {
      const { data: envioData, error: envioError } = await supabaseAdmin
        .from("envios")
        .insert({
          user_id: userId,
          contato_id: isTest ? null : to,
          template_id: isTest ? null : subject,
          status: "processando",
        })
        .select("id")
        .single();

      if (envioError) {
        console.error("Error creating envio record:", envioError);
      } else {
        envioId = envioData.id;
      }
    }

    // Get user's email settings
    const { data: settingsData, error: settingsError } = userId 
      ? await supabaseAdmin
          .from("configuracoes")
          .select("*")
          .eq("user_id", userId)
          .single()
      : { data: null, error: null };

    if (settingsError && !isTest) {
      console.error("Error fetching email settings:", settingsError);
      // Don't throw here, we'll use Resend as fallback
    }

    const emailSettings = settingsData || {
      use_smtp: true,
      email_smtp: process.env.BACKUP_SMTP_HOST,
      smtp_nome: "RocketMail",
      email_usuario: process.env.BACKUP_SMTP_USER,
      email_porta: 587,
    };

    // Log the settings (sensitive data redacted)
    console.log("Email configuration:", {
      use_smtp: emailSettings.use_smtp,
      email_smtp: emailSettings.email_smtp ? "configured" : "not configured",
      smtp_nome: emailSettings.smtp_nome,
      email_usuario: emailSettings.email_usuario ? "configured" : "not configured",
      email_porta: emailSettings.email_porta,
    });

    // Convert content to HTML format
    const htmlContent = content.replace(/\n/g, "<br>");
    
    // Prepare email data
    const emailData = {
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div>${htmlContent}</div>
          ${signature_image ? `<div style="margin-top: 20px;"><img src="${signature_image}" alt="Signature" style="max-height: 60px;" /></div>` : ''}
        </div>
      `,
      from: emailSettings.smtp_nome
        ? `${emailSettings.smtp_nome} <${emailSettings.email_usuario || "noreply@rocketmail.com"}>`
        : emailSettings.email_usuario || "RocketMail <noreply@rocketmail.com>",
    };

    let success = false;
    let error = null;
    let transportLog = '';

    // Check if we should use SMTP
    if (emailSettings.use_smtp && emailSettings.email_smtp && emailSettings.email_usuario && emailSettings.email_senha) {
      try {
        // Using user's SMTP configuration
        console.log("Using SMTP:", "xxxxxx"); // Sensitive info redacted
        
        console.log("SMTP Server:", emailSettings.email_smtp);
        console.log("SMTP Port:", emailSettings.email_porta);
        console.log("SMTP User:", emailSettings.email_usuario);
        console.log("SMTP Security:", emailSettings.smtp_seguranca || "tls");

        // Create SMTP transport
        const transport = nodemailer.createTransport({
          host: emailSettings.email_smtp,
          port: emailSettings.email_porta || 587,
          secure: (emailSettings.email_porta === 465) || (emailSettings.smtp_seguranca === "ssl"),
          auth: {
            user: emailSettings.email_usuario,
            pass: emailSettings.email_senha,
          },
          tls: {
            rejectUnauthorized: false, // Accept all certificates
          },
        });

        // Prepare email with configuration
        const mailOptions = {
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          attachments: []
        };

        console.log(`From: ${mailOptions.from} To: ${mailOptions.to}`);
        
        // Add signature image if provided
        if (signature_image) {
          mailOptions.attachments.push({
            filename: 'signature.png',
            path: signature_image,
            cid: 'signature@rocketmail' // Content ID to reference in HTML
          });
        }
        
        // Add attachments if provided
        if (attachments) {
          try {
            // Parse attachments if it's a string
            const parsedAttachments = typeof attachments === 'string' 
              ? JSON.parse(attachments) 
              : attachments;
              
            if (Array.isArray(parsedAttachments)) {
              parsedAttachments.forEach((attachment, index) => {
                if (attachment.url) {
                  mailOptions.attachments.push({
                    filename: attachment.name || `attachment-${index}.file`,
                    path: attachment.url
                  });
                }
              });
            }
          } catch (err) {
            console.error("Error processing attachments:", err);
          }
        }

        console.log(`Sending email via SMTP: ${emailSettings.email_smtp}:${emailSettings.email_porta}`);
        
        // Send mail with the defined transport object
        const info = await transport.sendMail(mailOptions);
        console.log(`Email sent successfully via SMTP: ${info.messageId}`);
        
        success = true;
        transportLog = 'nodemailer';
      } catch (err) {
        // SMTP failed, fallback to Resend
        console.error("SMTP error:", err);
        error = err;
      }
    }

    // If SMTP failed or wasn't used, try Resend
    if (!success) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          throw new Error("Resend API key missing");
        }

        const resend = new Resend(resendApiKey);
        
        // Prepare attachments if provided
        const resendAttachments = [];
        
        if (attachments) {
          try {
            // Parse attachments if it's a string
            const parsedAttachments = typeof attachments === 'string' 
              ? JSON.parse(attachments) 
              : attachments;
              
            if (Array.isArray(parsedAttachments)) {
              // For Resend, we need to fetch the attachment content
              for (const attachment of parsedAttachments) {
                if (attachment.url) {
                  try {
                    const response = await fetch(attachment.url);
                    if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.status}`);
                    
                    const buffer = await response.arrayBuffer();
                    resendAttachments.push({
                      filename: attachment.name || 'attachment.file',
                      content: buffer
                    });
                  } catch (fetchErr) {
                    console.error("Error fetching attachment:", fetchErr);
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error processing attachments for Resend:", err);
          }
        }

        // Send via Resend
        console.log("Sending email via Resend fallback");
        const { data, error: resendError } = await resend.emails.send({
          from: emailData.from,
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
          attachments: resendAttachments
        });

        if (resendError) throw resendError;
        console.log(`Email sent successfully via Resend: ${data?.id}`);
        
        success = true;
        transportLog = 'resend';
      } catch (err) {
        console.error("Resend error:", err);
        error = error || err; // Keep the original error if we had one
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
          })
          .eq("id", envioId);
      } else {
        console.log("Updated sending status to 'erro'");
        await supabaseAdmin
          .from("envios")
          .update({
            status: "erro",
            erro: error ? error.message : "Unknown error",
          })
          .eq("id", envioId);
      }
    }

    if (success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sent successfully", 
          details: { transport: transportLog }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: error ? error.message : "Failed to send email through all available methods",
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
