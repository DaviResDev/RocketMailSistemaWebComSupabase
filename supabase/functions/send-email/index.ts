
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmail, sendEmailViaSMTP, sendEmailViaResend } from "./lib/email-sender.js";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const requestData = await req.json();
    
    const { 
      to, 
      subject, 
      content, 
      signature_image,
      attachments,
      contato_nome,
      image_url,
      smtp_settings
    } = requestData;
    
    console.log("Received email request:", { 
      to, 
      subject, 
      contentLength: content?.length,
      hasSignatureImage: !!signature_image,
      hasAttachments: !!attachments,
      hasImageUrl: !!image_url,
      hasSmtpSettings: !!smtp_settings
    });
    
    if (!to) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Recipient email (to) is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Process the content to include image and signature
    let finalContent = "";
    
    // Add image at the top if available
    if (image_url) {
      finalContent += `<div style="margin-bottom: 20px;">
        <img src="${image_url}" alt="Template image" style="max-width: 100%; height: auto;" />
      </div>`;
    }
    
    // Add main content
    finalContent += content || "";
    
    // Append signature image if available - add empty signature div even if no signature image
    if (signature_image && signature_image !== 'no_signature') {
      finalContent += `<div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
        <img src="${signature_image}" alt="Assinatura" style="max-height: 100px;" />
      </div>`;
    }
    
    // Process attachments if available
    let emailAttachments = [];
    if (attachments) {
      try {
        let attachmentsData = null;
        
        if (typeof attachments === 'string') {
          try {
            attachmentsData = JSON.parse(attachments);
          } catch (e) {
            console.error("Error parsing attachments JSON string:", e);
            attachmentsData = null;
          }
        } else {
          attachmentsData = attachments;
        }
        
        if (Array.isArray(attachmentsData)) {
          emailAttachments = attachmentsData.map(attachment => {
            // Make sure we have valid attachment data
            if (!attachment.name && !attachment.file_name) {
              console.warn("Missing filename in attachment:", attachment);
            }
            if (!attachment.url && !attachment.file_url) {
              console.warn("Missing URL in attachment:", attachment);
            }
            
            return {
              filename: attachment.name || attachment.file_name || 'attachment',
              content: attachment.url || attachment.file_url || ''
            };
          }).filter(att => att.content); // Filter out attachments with empty URLs
        }
      } catch (error) {
        console.error("Error processing attachments:", error);
      }
    }
    
    // Log the attachments we're going to send
    if (emailAttachments.length > 0) {
      console.log(`Sending ${emailAttachments.length} attachments:`, 
        emailAttachments.map(a => a.filename));
    }
    
    // Prepare friendly name for the recipient
    const toAddress = contato_nome ? `"${contato_nome}" <${to}>` : to;
    
    try {
      // Determine if we should use SMTP or Resend
      let result;
      if (smtp_settings && smtp_settings.from_email) {
        console.log("Using SMTP for email delivery via email:", smtp_settings.from_email);
        
        // Configure SMTP settings
        const smtpConfig = {
          host: requestData.smtp_settings?.host || Deno.env.get('SMTP_HOST'),
          port: parseInt(requestData.smtp_settings?.port) || 587,
          secure: requestData.smtp_settings?.secure || false,
          user: smtp_settings.from_email,
          pass: requestData.smtp_settings?.password || Deno.env.get('SMTP_PASSWORD'),
          name: smtp_settings.from_name || '',
        };
        
        // Use sendEmail function from email-sender.js which handles both SMTP and Resend
        result = await sendEmail(
          {
            to: toAddress,
            cc: requestData.cc,
            bcc: requestData.bcc,
            subject: subject || "Email sem assunto",
            html: finalContent,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
          }, 
          true, // Use SMTP
          smtpConfig, 
          apiKey, 
          smtp_settings.from_name || "DisparoPro"
        );
      } else {
        console.log("Using Resend for email delivery");
        
        // Use direct Resend sendEmail function
        const resend = new Resend(apiKey);
        const { data, error } = await resend.emails.send({
          from: "DisparoPro <onboarding@resend.dev>",
          to: [toAddress],
          subject: subject || "Email sem assunto",
          html: finalContent,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
        
        if (error) {
          throw error;
        }
        
        result = { 
          success: true, 
          id: data?.id,
          provider: "resend" 
        };
      }
      
      console.log("Email sent successfully:", result);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          data: result
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: emailError.message || "Failed to send email"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
