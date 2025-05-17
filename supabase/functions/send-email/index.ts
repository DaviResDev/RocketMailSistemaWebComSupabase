
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    const resend = new Resend(apiKey);
    const requestData = await req.json();
    
    const { 
      to, 
      subject, 
      content, 
      signature_image,
      attachments,
      contato_nome
    } = requestData;
    
    console.log("Received email request:", { 
      to, 
      subject, 
      contentLength: content?.length,
      hasSignatureImage: !!signature_image,
      hasAttachments: !!attachments
    });
    
    if (!to) {
      throw new Error("Recipient email (to) is required");
    }
    
    // Process the content to include image and signature
    let finalContent = content || "";
    
    // Append signature image if available
    if (signature_image && signature_image !== 'no_signature') {
      finalContent += `<img src="${signature_image}" alt="Assinatura" style="max-height: 100px; margin-top: 10px;" />`;
    }
    
    // Process attachments if available
    let emailAttachments = [];
    if (attachments) {
      try {
        const attachmentsData = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
        
        if (Array.isArray(attachmentsData)) {
          emailAttachments = attachmentsData.map(attachment => ({
            filename: attachment.name || attachment.file_name,
            content: attachment.url || attachment.file_url
          }));
        }
      } catch (error) {
        console.error("Error processing attachments:", error);
      }
    }
    
    // Prepare friendly name for the recipient
    const toAddress = contato_nome ? `"${contato_nome}" <${to}>` : to;
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "DisparoPro <onboarding@resend.dev>", // You can customize this
      to: [toAddress],
      subject: subject || "Email sem assunto",
      html: finalContent,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });
    
    if (error) {
      console.error("Error sending email with Resend:", error);
      throw error;
    }
    
    console.log("Email sent successfully:", data);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
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
