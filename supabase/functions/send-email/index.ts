import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface EmailRequest {
  to: string;
  subject?: string;
  content?: string;
  attachments?: any[];
  signature_image?: string;
  contato_id?: string;
  template_id?: string;
  agendamento_id?: string;
  isTest?: boolean;
}

interface Settings {
  use_smtp?: boolean;
  email_smtp?: string;
  email_porta?: number;
  smtp_nome?: string;
  email_usuario?: string;
  email_senha?: string;
  smtp_seguranca?: string;
  signature_image?: string;
}

serve(async (req: Request) => {
  console.log("Listening on http://localhost:9999/");
  console.log("SUPABASE_URL available:", !!Deno.env.get("SUPABASE_URL"));
  console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  console.log("RESEND_API_KEY available:", !!Deno.env.get("RESEND_API_KEY"));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }
  
  try {
    const { 
      to, 
      subject = "Assunto não definido", 
      content = "", 
      attachments = [],
      signature_image,
      contato_id,
      template_id,
      agendamento_id,
      isTest = false 
    }: EmailRequest = await req.json();
    
    // Log request details for debugging
    console.log("Email request received:", {
      to,
      contato_nome: content.includes("Olá") ? content.split("Olá ")[1]?.split(",")[0] : undefined,
      subject,
      contentLength: content.length,
      hasAttachments: !!attachments,
      hasSignature: !!signature_image,
      attachmentsCount: Array.isArray(attachments) ? attachments.length : (attachments ? 1 : 0),
      contato_id,
      template_id
    });
    
    // Log content preview for debugging
    console.log("Content preview:", content.slice(0, 100));
    
    // Debug attachments
    console.log("Attachments type:", typeof attachments);
    
    let parsedAttachments: any[] = [];
    
    if (attachments) {
      // If it's a string, try to parse it as JSON
      if (typeof attachments === 'string') {
        try {
          parsedAttachments = JSON.parse(attachments);
        } catch (e) {
          console.error("Error parsing attachments string:", e);
          parsedAttachments = [];
        }
      } 
      // If it's already an array, use it directly
      else if (Array.isArray(attachments)) {
        parsedAttachments = attachments;
      }
      // If it's an object but not an array, wrap it in an array
      else if (typeof attachments === 'object') {
        parsedAttachments = [attachments];
      }
    }
    
    // Log parsed attachments for debugging
    console.log("Attachments structure:", JSON.stringify(parsedAttachments).slice(0, 200));
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );
    
    // Create record in envios table
    const { data: envioData, error: envioError } = await supabaseAdmin
      .from("envios")
      .insert([{
        contato_id: contato_id,
        template_id: template_id,
        agendamento_id: agendamento_id,
        status: "enviando",
        user_id: (await supabaseAdmin.auth.getUser()).data.user?.id
      }])
      .select("id")
      .single();
      
    if (envioError) {
      throw new Error(`Error creating envio record: ${envioError.message}`);
    }
    
    const envioId = envioData.id;
    console.log("Created envio record with ID:", envioId);
    
    // Get user settings for SMTP
    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from("configuracoes")
      .select("*")
      .eq("user_id", (await supabaseAdmin.auth.getUser()).data.user?.id)
      .maybeSingle();
      
    if (settingsError) {
      throw new Error(`Error fetching user settings: ${settingsError.message}`);
    }
    
    console.log("User settings:", JSON.stringify(userSettings));
    
    // Process attachments - ensure they are in correct format
    console.log("Processing", parsedAttachments.length, "attachments as array");
    const emailAttachments: any[] = [];
    
    for (const attachment of parsedAttachments) {
      if (attachment && attachment.url) {
        try {
          const response = await fetch(attachment.url);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            emailAttachments.push({
              name: attachment.name || "arquivo.pdf",
              content: new Uint8Array(buffer),
            });
          }
        } catch (e) {
          console.error("Error processing attachment:", e);
        }
      }
    }
    
    // Add signature at the end of the content
    let htmlContent = content;
    
    // Always ensure signature is added at the end, not inline
    if (signature_image && signature_image !== 'no_signature') {
      // Clear any existing signature markers if present
      htmlContent = htmlContent.replace(/<br><br>--<br>.*?$/s, '');
      // Add the signature at the end with proper spacing
      htmlContent += '<br><br>--<br>';
      htmlContent += `<img src="${signature_image}" alt="Assinatura" style="max-width: 100%; max-height: 100px;" />`;
    }
    
    console.log("HTML content length:", htmlContent.length, "characters");
    
    // Attempt to send via SMTP first if configured
    console.log("Attempting to send via SMTP first");
    
    if (userSettings?.use_smtp && userSettings?.email_smtp && userSettings?.email_usuario && userSettings?.email_senha) {
      try {
        const client = new SmtpClient();
        
        const smtpConfig = {
          host: userSettings.email_smtp,
          port: userSettings.email_porta || 587,
          secure: false, // Use STARTTLS
          auth: {
            user: userSettings.email_usuario,
            pass: userSettings.email_senha
          },
          name: userSettings.smtp_nome || undefined
        };
        
        console.log("SMTP Configuration:", {
          ...smtpConfig,
          auth: { 
            user: smtpConfig.auth.user, 
            pass: "***" 
          }
        });
        
        console.log(`Sending email via SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
        console.log(`From: "${smtpConfig.name}" <${smtpConfig.auth.user}> To: ${to}`);
        console.log(`Subject: ${subject}`);
        
        await client.connect(smtpConfig);
        
        // Verify SMTP connection
        const verifyResult = await client.verify();
        console.log("SMTP verification result:", verifyResult);
        
        // Send email
        const smtpResult = await client.send({
          from: `"${smtpConfig.name || "Notification"}" <${smtpConfig.auth.user}>`,
          to: to,
          subject: subject,
          content: htmlContent,
          html: htmlContent,
          attachments: emailAttachments
        });
        
        console.log("Email sent successfully via SMTP:", smtpResult);
        console.log("SMTP Response:", smtpResult.response);
        await client.close();
        
        // Update envio status to delivered
        const { error: updateError } = await supabaseAdmin
          .from("envios")
          .update({ status: "entregue" })
          .eq("id", envioId);
        
        if (updateError) {
          console.error("Error updating envio status:", updateError);
        } else {
          console.log("Updated sending status to 'entregue'");
        }
        
        // Return success response with SMTP details
        return new Response(
          JSON.stringify({
            success: true,
            provider: "smtp",
            message: "Email sent successfully via SMTP",
            data: {
              id: smtpResult.messageId,
              envio_id: envioId
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smtpError: any) {
        // Log SMTP error but fall back to Resend
        console.error("SMTP Error:", smtpError.message);
        
        // Update envio with error
        await supabaseAdmin
          .from("envios")
          .update({ 
            status: "erro",
            erro: `SMTP Error: ${smtpError.message}`
          })
          .eq("id", envioId);
        
        // Fall back to Resend
        console.log("SMTP failed, falling back to Resend API...");
      }
    }
    
    // If SMTP not configured or failed, use Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("Resend API Key not found");
    }
    
    // Format email with Resend
    const emailData = {
      from: "Notification <onboarding@resend.dev>",
      to: to,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments.map(att => ({
        filename: att.name,
        content: att.content
      }))
    };
    
    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailData),
    });
    
    const resendResult = await resendResponse.json();
    
    if (resendResponse.ok) {
      console.log("Email sent successfully via Resend:", resendResult);
      
      // Update envio status to delivered
      await supabaseAdmin
        .from("envios")
        .update({ status: "entregue" })
        .eq("id", envioId);
        
      return new Response(
        JSON.stringify({
          success: true,
          provider: "resend",
          message: "Email sent successfully via Resend",
          data: {
            id: resendResult.id,
            envio_id: envioId
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Resend API error:", resendResult);
      
      // Update envio with error
      await supabaseAdmin
        .from("envios")
        .update({ 
          status: "erro",
          erro: `Resend Error: ${JSON.stringify(resendResult)}`
        })
        .eq("id", envioId);
        
      throw new Error(`Resend API error: ${JSON.stringify(resendResult)}`);
    }
    
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
