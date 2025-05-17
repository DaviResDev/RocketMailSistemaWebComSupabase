
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import nodemailer from "npm:nodemailer@6.9.12";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Send email via SMTP using Nodemailer
 */
async function sendEmailViaSMTP(config, payload) {
  console.log("SMTP Configuration:", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: "***" },
    name: config.name || ''
  });
  
  try {
    // Create transporter with timeouts to prevent hanging connections
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || config.port === 465, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 15000, // 15 seconds
      greetingTimeout: 15000, // 15 seconds
      socketTimeout: 30000, // 30 seconds
      logger: false, // Disable logging for cleaner operation
      debug: false, // Disable debug for cleaner operation
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates for better compatibility
      },
    });
    
    // Extract domain from email for proper DKIM setup
    const emailDomain = config.user.split('@')[1];
    
    // Properly format the from field to ensure correct domain display
    const fromName = config.name || config.user.split('@')[0];
    const fromEmail = config.user; // Always use the configured email
    const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    
    // Prepare email data with improved structure for better MIME handling
    const mailOptions = {
      from: from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      headers: {
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=utf-8',
        'X-Mailer': 'RocketMail',
        'X-Priority': '3',
      }
    };

    // Add CC if provided
    if (payload.cc && payload.cc.length > 0) {
      mailOptions.cc = payload.cc;
    }
    
    // Add BCC if provided
    if (payload.bcc && payload.bcc.length > 0) {
      mailOptions.bcc = payload.bcc;
    }
    
    // Improved attachment handling with better MIME type detection
    if (payload.attachments && payload.attachments.length > 0) {
      mailOptions.attachments = payload.attachments.map(attachment => {
        console.log(`Processing attachment: ${JSON.stringify(attachment.filename || attachment.name || 'unnamed')}`);
        
        // For binary content (Uint8Array)
        if (attachment.content instanceof Uint8Array) {
          return {
            filename: attachment.filename || attachment.name || 'attachment.file',
            content: attachment.content,
            contentType: attachment.contentType || attachment.type || undefined,
            encoding: 'base64'
          };
        }
        
        // For base64 content
        if (attachment.content && typeof attachment.content === 'string') {
          // Remove the data URI prefix if present
          const base64Content = attachment.content.includes('base64,') ? 
            attachment.content.split('base64,')[1] : 
            attachment.content;
            
          return {
            filename: attachment.filename || attachment.name || 'attachment.file',
            content: base64Content,
            contentType: attachment.contentType || attachment.type || undefined,
            encoding: 'base64'
          };
        }
        
        // If content is not provided but url is
        if (attachment.url && !attachment.content) {
          return {
            path: attachment.url,
            filename: attachment.filename || attachment.name || 'attachment.file',
            contentType: attachment.contentType || attachment.type || undefined
          };
        }
        
        return attachment;
      });
      
      console.log(`Adding ${mailOptions.attachments.length} attachments to email`);
    }

    console.log(`Sending email via SMTP: ${config.host}:${config.port}`);
    console.log(`From: ${mailOptions.from} To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`HTML content length: ${payload.html?.length || 0} characters`);
    
    // Verify SMTP configuration before sending
    try {
      const verifyResult = await transporter.verify();
      console.log("SMTP verification result:", verifyResult);
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError);
      throw new Error(`SMTP verification failed: ${verifyError.message}`);
    }
    
    // Send mail with defined transport object
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully via SMTP:", info.messageId);
      console.log("SMTP Response:", info.response);
      return {
        success: true,
        id: info.messageId,
        provider: "smtp",
        from: from,
        reply_to: fromEmail,
        response: info.response
      };
    } catch (error) {
      console.error("Failed to send email via SMTP:", error);
      throw error;
    }
  } catch (error) {
    console.error("SMTP Error:", error);
    throw error;
  }
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend(resendApiKey, fromName, replyTo, payload) {
  try {
    const resend = new Resend(resendApiKey);
    
    if (!resendApiKey) {
      throw new Error("Missing Resend API key. Please configure it in your Supabase secrets.");
    }
    
    // Create email data for Resend
    const emailData = {
      from: `${fromName || 'RocketMail'} <onboarding@resend.dev>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    };
    
    // Add reply-to if provided
    if (replyTo) {
      emailData.reply_to = replyTo;
    }
    
    // Add CC if provided
    if (payload.cc && payload.cc.length > 0) {
      emailData.cc = payload.cc;
    }
    
    // Add BCC if provided
    if (payload.bcc && payload.bcc.length > 0) {
      emailData.bcc = payload.bcc;
    }
    
    // Add attachments if provided - improved handling
    if (payload.attachments && payload.attachments.length > 0) {
      emailData.attachments = payload.attachments.map(attachment => {
        console.log(`Processing Resend attachment: ${JSON.stringify(attachment.filename || attachment.name || 'unnamed')}`);
        
        // Return an object in the format Resend expects
        let content = '';
        
        if (attachment.content instanceof Uint8Array) {
          content = Buffer.from(attachment.content).toString('base64');
        } else if (typeof attachment.content === 'string') {
          content = attachment.content.includes('base64,') 
            ? attachment.content.split('base64,')[1] 
            : attachment.content;
        } else {
          content = attachment.content;
        }
        
        return {
          filename: attachment.filename || attachment.name || 'attachment.file',
          content: content,
          contentType: attachment.contentType || attachment.type || undefined
        };
      });
      
      console.log(`Adding ${emailData.attachments.length} attachments to email (Resend)`);
    }
    
    console.log(`Sending email via Resend`);
    console.log(`From: ${emailData.from} To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`HTML content length: ${payload.html?.length || 0} characters`);
    
    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || "Unknown Resend error");
    }
    
    console.log("Email sent successfully via Resend:", result.id);
    return {
      success: true,
      id: result.id,
      provider: "resend",
      from: emailData.from,
      reply_to: emailData.reply_to,
    };
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    throw error;
  }
}

/**
 * Send email with SMTP or Resend with robust error handling
 */
async function sendEmail(payload, useSmtp, smtpConfig, resendApiKey, fromName) {
  // Always try with SMTP if configured and useSmtp is true
  if (useSmtp && smtpConfig && smtpConfig.host && smtpConfig.port && 
      smtpConfig.user && smtpConfig.pass) {
    try {
      console.log("Attempting to send via SMTP first");
      return await sendEmailViaSMTP(smtpConfig, payload);
    } catch (smtpError) {
      console.error("SMTP send failed:", smtpError.message);
      
      // If SMTP fails, try Resend if available
      if (resendApiKey) {
        console.log("SMTP failed. Trying Resend as fallback...");
        try {
          const result = await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
          result.note = "Fallback from SMTP failure";
          return result;
        } catch (resendError) {
          console.error("Resend fallback also failed:", resendError.message);
          throw new Error(`SMTP error: ${smtpError.message}. Resend fallback also failed: ${resendError.message}`);
        }
      } else {
        throw new Error(`SMTP error with ${smtpConfig.host}: ${smtpError.message}. Check your SMTP credentials and settings.`);
      }
    }
  }
  
  // If SMTP is not configured, use Resend
  if (!resendApiKey) {
    throw new Error("No email sending method available. Configure SMTP or provide Resend API key.");
  }
  
  console.log("SMTP not configured or disabled. Using Resend directly.");
  return await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Check for Resend API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY is not configured"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request data format"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
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
              url: attachment.url || attachment.file_url || ''
            };
          }).filter(att => att.url); // Filter out attachments with empty URLs
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
          host: smtp_settings?.host || Deno.env.get('SMTP_HOST'),
          port: parseInt(smtp_settings?.port) || 587,
          secure: smtp_settings?.secure || false,
          user: smtp_settings.from_email,
          pass: smtp_settings?.password || Deno.env.get('SMTP_PASSWORD'),
          name: smtp_settings.from_name || '',
        };
        
        // Use sendEmail function to handle both SMTP and Resend
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
        
        // Use sendEmail function with Resend
        result = await sendEmail(
          {
            to: toAddress,
            cc: requestData.cc,
            bcc: requestData.bcc,
            subject: subject || "Email sem assunto",
            html: finalContent,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
          }, 
          false, // Don't use SMTP
          null,
          apiKey, 
          "DisparoPro"
        );
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
        error: error.message || "An unexpected error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
