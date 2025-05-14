
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Since there are Buffer issues with nodemailer in Deno environment, we'll use only Resend
import { Resend } from "https://esm.sh/resend@1.0.0";

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
    const { to, subject, content, isTest, signature_image, attachments, contato_id, template_id, user_id, agendamento_id } = await req.json();

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
        const { data: envioData, error: envioError } = await supabaseAdmin
          .from("envios")
          .insert({
            user_id: userId,
            contato_id: contato_id || null, // Make sure we use null instead of a non-UUID value
            template_id: template_id || null, // Make sure we use null instead of a non-UUID value
            status: "processando",
            agendamento_id: agendamento_id || null
          })
          .select("id")
          .single();

        if (envioError) {
          console.error("Error creating envio record:", envioError);
        } else {
          envioId = envioData.id;
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
      from: settingsData?.smtp_nome
        ? `${settingsData.smtp_nome} <${settingsData.email_usuario || "noreply@rocketmail.com"}>`
        : settingsData?.email_usuario || "RocketMail <noreply@rocketmail.com>",
    };

    // Process attachments
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
        console.error("Error processing attachments:", err);
      }
    }

    // Determine email sending method based on user settings
    let success = false;
    let error = null;
    
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("Resend API key missing");
      }

      const resend = new Resend(resendApiKey);
      
      console.log("Sending email via Resend");
      const { data, error: resendError } = await resend.emails.send({
        from: emailData.from,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        attachments: resendAttachments.length > 0 ? resendAttachments : undefined
      });

      if (resendError) throw resendError;
      console.log(`Email sent successfully via Resend: ${data?.id}`);
      
      success = true;
    } catch (err) {
      console.error("Resend error:", err);
      error = err;
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
          details: { transport: "resend" }
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
