
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Simple HTML to plain text converter
 */
function stripHtml(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p.*?>/gi, '\n')
    .replace(/<li.*?>/gi, '\n- ')
    .replace(/<.*?>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Validate and sanitize attachment data
 */
function validateAndSanitizeAttachments(attachments: any, isResend: boolean = false): any[] {
  if (!attachments) return [];
  
  try {
    let attachmentArray: any[] = [];
    
    if (typeof attachments === 'string') {
      if (attachments.trim() === '' || attachments === '[]') return [];
      try {
        attachmentArray = JSON.parse(attachments);
      } catch (e) {
        console.error("Failed to parse attachment string:", e);
        return [];
      }
    } else if (Array.isArray(attachments)) {
      attachmentArray = attachments;
    } else if (attachments && typeof attachments === 'object') {
      attachmentArray = [attachments];
    }
    
    return attachmentArray
      .filter(attachment => {
        if (!attachment || typeof attachment !== 'object') return false;
        
        const hasName = attachment.name || attachment.filename;
        const hasContent = attachment.content || attachment.url || attachment.path;
        
        if (!hasName || !hasContent) {
          console.warn("Skipping invalid attachment:", {
            hasName: !!hasName,
            hasContent: !!hasContent
          });
          return false;
        }
        
        // Skip URL-based attachments for Resend unless they have base64 content
        if (isResend && (attachment.url || attachment.path) && !attachment.content) {
          console.warn("Skipping URL-based attachment for Resend:", attachment.filename || attachment.name);
          return false;
        }
        
        return true;
      })
      .map(attachment => ({
        filename: attachment.filename || attachment.name || 'attachment',
        content: attachment.content || undefined,
        url: attachment.url || attachment.path || undefined,
        contentType: attachment.contentType || attachment.type || 'application/octet-stream'
      }));
  } catch (error) {
    console.error("Error validating attachments:", error);
    return [];
  }
}

/**
 * Create SMTP transporter with proper error handling
 */
async function createSMTPTransporter(config: any) {
  try {
    // Import nodemailer dynamically to handle Buffer issues
    const nodemailer = await import("https://esm.sh/nodemailer@6.9.12");
    
    const transportConfig = {
      host: config.host,
      port: parseInt(config.port) || 587,
      secure: config.secure || config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
    };
    
    console.log("Creating SMTP transporter with config:", {
      host: config.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      user: config.user
    });
    
    const transporter = nodemailer.default.createTransporter(transportConfig);
    
    // Verify SMTP connection
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    
    return transporter;
  } catch (error) {
    console.error("Failed to create/verify SMTP transporter:", error);
    throw new Error(`SMTP configuration error: ${error.message}`);
  }
}

/**
 * Send email via SMTP using Nodemailer
 */
async function sendEmailViaSMTP(config: any, payload: any): Promise<any> {
  try {
    const transporter = await createSMTPTransporter(config);
    
    const fromName = config.name || config.user.split('@')[0];
    const fromEmail = config.user;
    const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    
    const mailOptions: any = {
      from: from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: stripHtml(payload.html),
      headers: {
        'MIME-Version': '1.0',
        'X-Mailer': 'RocketMail SMTP',
      }
    };

    if (payload.cc && payload.cc.length > 0) {
      mailOptions.cc = payload.cc;
    }
    
    if (payload.bcc && payload.bcc.length > 0) {
      mailOptions.bcc = payload.bcc;
    }
    
    // Process attachments for SMTP
    if (payload.attachments && payload.attachments.length > 0) {
      const validatedAttachments = validateAndSanitizeAttachments(payload.attachments, false);
      
      if (validatedAttachments.length > 0) {
        mailOptions.attachments = validatedAttachments.map(attachment => {
          console.log(`Processing SMTP attachment: ${attachment.filename}`);
          
          if (attachment.content && typeof attachment.content === 'string') {
            const base64Content = attachment.content.includes('base64,') ? 
              attachment.content.split('base64,')[1] : 
              attachment.content;
              
            return {
              filename: attachment.filename,
              content: base64Content,
              contentType: attachment.contentType,
              encoding: 'base64'
            };
          }
          
          if (attachment.url && !attachment.content) {
            return {
              path: attachment.url,
              filename: attachment.filename,
              contentType: attachment.contentType
            };
          }
          
          return attachment;
        });
        
        console.log(`Adding ${mailOptions.attachments.length} attachments to SMTP email`);
      }
    }

    console.log(`Sending email via SMTP to: ${payload.to}`);
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via SMTP:", info.messageId);
    
    // Close transporter
    transporter.close();
    
    return {
      success: true,
      id: info.messageId,
      provider: "smtp",
      from: from,
      to: payload.to,
      response: info.response
    };
  } catch (error) {
    console.error("SMTP Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw new Error(`SMTP send failed: ${error.message || 'Unknown SMTP error'}`);
  }
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend(resendApiKey: string, fromName: string, replyTo: string, payload: any): Promise<any> {
  try {
    const resend = new Resend(resendApiKey);
    
    if (!resendApiKey || resendApiKey.trim() === '') {
      throw new Error("Missing or invalid Resend API key");
    }
    
    const emailData: any = {
      from: `${fromName || 'RocketMail'} <onboarding@resend.dev>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: stripHtml(payload.html),
    };
    
    if (replyTo) {
      emailData.reply_to = replyTo;
    }
    
    if (payload.cc && payload.cc.length > 0) {
      emailData.cc = payload.cc;
    }
    
    if (payload.bcc && payload.bcc.length > 0) {
      emailData.bcc = payload.bcc;
    }
    
    // Process attachments - only base64 content for Resend
    if (payload.attachments && payload.attachments.length > 0) {
      const validatedAttachments = validateAndSanitizeAttachments(payload.attachments, true);
      
      if (validatedAttachments.length > 0) {
        emailData.attachments = validatedAttachments.map(attachment => {
          console.log(`Processing Resend attachment: ${attachment.filename}`);
          
          let content = '';
          
          if (typeof attachment.content === 'string') {
            content = attachment.content.includes('base64,') 
              ? attachment.content.split('base64,')[1] 
              : attachment.content;
          } else {
            throw new Error(`Invalid attachment content for: ${attachment.filename}`);
          }
          
          if (!content || content.trim() === '') {
            throw new Error(`Empty content for attachment: ${attachment.filename}`);
          }
          
          return {
            filename: attachment.filename,
            content: content,
            contentType: attachment.contentType
          };
        });
        
        console.log(`Adding ${emailData.attachments.length} validated attachments to Resend email`);
      }
    }
    
    console.log(`Sending email via Resend to: ${payload.to}`);
    
    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || "Unknown Resend error");
    }
    
    console.log("Email sent successfully via Resend:", result.data?.id);
    return {
      success: true,
      id: result.data?.id,
      provider: "resend",
      from: emailData.from,
      to: payload.to,
      reply_to: emailData.reply_to,
    };
  } catch (error) {
    console.error("Resend Error details:", error);
    throw new Error(`Resend send failed: ${error.message || 'Unknown Resend error'}`);
  }
}

/**
 * Send single email with improved error handling
 */
async function sendSingleEmail(payload: any, useSmtp: boolean, smtpConfig: any, resendApiKey: string, fromName: string): Promise<any> {
  let lastError: Error | null = null;
  
  // Try SMTP first if configured
  if (useSmtp && smtpConfig && smtpConfig.host && smtpConfig.port && 
      smtpConfig.user && smtpConfig.pass) {
    try {
      console.log("Attempting to send via SMTP");
      return await sendEmailViaSMTP(smtpConfig, payload);
    } catch (smtpError) {
      console.error("SMTP send failed:", smtpError.message);
      lastError = smtpError;
      
      // Fallback to Resend if available
      if (resendApiKey && resendApiKey.trim() !== '') {
        console.log("SMTP failed. Trying Resend as fallback...");
        try {
          const result = await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
          result.note = "Fallback from SMTP failure";
          return result;
        } catch (resendError) {
          console.error("Resend fallback also failed:", resendError.message);
          throw new Error(`SMTP error: ${smtpError.message}. Resend fallback failed: ${resendError.message}`);
        }
      } else {
        throw new Error(`SMTP error: ${smtpError.message}. No fallback available (missing Resend API key).`);
      }
    }
  }
  
  // Use Resend if SMTP not configured or failed
  if (!resendApiKey || resendApiKey.trim() === '') {
    throw new Error("No email sending method available. Configure SMTP or provide valid Resend API key.");
  }
  
  console.log("Using Resend for email delivery");
  return await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
}

/**
 * Process multiple emails in controlled batches with better error handling
 */
async function processBatchEmails(emailRequests: any[], useSmtp: boolean, smtpConfig: any, resendApiKey: string, fromName: string): Promise<any> {
  const batchSize = 50; // Increased batch size as requested
  const delayBetweenBatches = 1000; // 1 second between batches
  const results: any[] = [];
  
  console.log(`Processing ${emailRequests.length} emails in batches of ${batchSize}`);
  
  for (let i = 0; i < emailRequests.length; i += batchSize) {
    const batch = emailRequests.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emailRequests.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
    
    // Process batch with Promise.all for better performance
    const batchPromises = batch.map(async (emailData, index) => {
      const globalIndex = i + index;
      try {
        console.log(`Sending email ${globalIndex + 1}/${emailRequests.length} to: ${emailData.to}`);
        
        const result = await sendSingleEmail(
          emailData, 
          useSmtp, 
          smtpConfig, 
          resendApiKey, 
          fromName
        );
        
        return {
          success: true,
          result: result,
          to: emailData.to,
          index: globalIndex,
          provider: result.provider
        };
      } catch (error) {
        console.error(`Failed to send email ${globalIndex + 1} to ${emailData.to}:`, error.message);
        return {
          success: false,
          error: error.message,
          to: emailData.to,
          index: globalIndex
        };
      }
    });
    
    // Wait for all emails in this batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < emailRequests.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`Batch processing complete: ${successCount} successful, ${failureCount} failed`);
  
  return {
    results,
    summary: {
      total: emailRequests.length,
      successful: successCount,
      failed: failureCount,
      successRate: emailRequests.length > 0 ? ((successCount / emailRequests.length) * 100).toFixed(1) : "0"
    }
  };
}

/**
 * Optimize payload size to prevent 1MB limit issues
 */
function optimizeEmailPayload(emailData: any): any {
  const optimized = { ...emailData };
  
  // Limit content size if too large
  if (optimized.content && optimized.content.length > 500000) { // 500KB limit for content
    console.warn(`Content too large (${optimized.content.length} chars), truncating...`);
    optimized.content = optimized.content.substring(0, 500000) + "\n\n[Conteúdo truncado devido ao tamanho]";
  }
  
  // Optimize attachments
  if (optimized.attachments && Array.isArray(optimized.attachments)) {
    optimized.attachments = optimized.attachments.filter(attachment => {
      if (attachment.content && typeof attachment.content === 'string') {
        const sizeEstimate = attachment.content.length * 0.75; // Base64 overhead
        if (sizeEstimate > 5000000) { // 5MB limit per attachment
          console.warn(`Attachment ${attachment.filename} too large, skipping...`);
          return false;
        }
      }
      return true;
    });
  }
  
  return optimized;
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    const apiKey = Deno.env.get("RESEND_API_KEY");
    
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
    
    // Handle batch email sending
    if (requestData.batch && Array.isArray(requestData.emails)) {
      console.log(`Received batch email request for ${requestData.emails.length} recipients`);
      
      // Optimize each email payload
      const emailRequests = requestData.emails.map(emailData => {
        const optimizedData = optimizeEmailPayload(emailData);
        
        // Build email HTML with proper structure
        let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${optimizedData.subject || "Email"}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #333333; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto;">`;
        
        if (optimizedData.image_url) {
          finalContent += `
    <div style="margin-bottom: 20px;">
      <img src="${optimizedData.image_url}" alt="Header image" style="max-width: 100%; height: auto;" />
    </div>`;
        }
        
        finalContent += `
    <div style="margin-bottom: 20px;">
      ${optimizedData.content || ""}
    </div>`;
        
        if (optimizedData.signature_image && optimizedData.signature_image !== 'no_signature') {
          finalContent += `
    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
      <img src="${optimizedData.signature_image}" alt="Assinatura" style="max-height: 100px;" />
    </div>`;
        }
        
        finalContent += `
  </div>
</body>
</html>`;
        
        const toAddress = optimizedData.contato_nome ? `"${optimizedData.contato_nome}" <${optimizedData.to}>` : optimizedData.to;
        
        return {
          to: toAddress,
          subject: optimizedData.subject || "Sem assunto",
          html: finalContent,
          attachments: optimizedData.attachments || []
        };
      });
      
      try {
        const batchResult = await processBatchEmails(
          emailRequests,
          !!requestData.smtp_settings,
          requestData.smtp_settings ? {
            host: requestData.smtp_settings.host || "",
            port: parseInt(requestData.smtp_settings.port) || 587,
            secure: requestData.smtp_settings.secure || false,
            user: requestData.smtp_settings.from_email,
            pass: requestData.smtp_settings.password,
            name: requestData.smtp_settings.from_name
          } : null,
          apiKey || "",
          requestData.smtp_settings?.from_name || "RocketMail"
        );
        
        console.log("Batch email processing completed:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Batch email processing completed",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || null
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("Batch email processing failed:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || "Batch email processing failed"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }
    
    // Handle single email sending
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
    
    console.log("Received single email request:", { 
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
    
    // Optimize payload
    const optimizedRequest = optimizeEmailPayload(requestData);
    
    // Build email HTML with proper structure
    let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || "Email"}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #333333; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto;">`;
    
    if (image_url) {
      finalContent += `
    <div style="margin-bottom: 20px;">
      <img src="${image_url}" alt="Header image" style="max-width: 100%; height: auto;" />
    </div>`;
    }
    
    finalContent += `
    <div style="margin-bottom: 20px;">
      ${optimizedRequest.content || ""}
    </div>`;
    
    if (signature_image && signature_image !== 'no_signature') {
      finalContent += `
    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
      <img src="${signature_image}" alt="Assinatura" style="max-height: 100px;" />
    </div>`;
    }
    
    finalContent += `
  </div>
</body>
</html>`;
    
    // Process and validate attachments
    let emailAttachments: any[] = [];
    if (optimizedRequest.attachments) {
      try {
        emailAttachments = validateAndSanitizeAttachments(optimizedRequest.attachments, !smtp_settings);
        console.log(`Processed ${emailAttachments.length} valid attachments`);
      } catch (error) {
        console.error("Error processing attachments:", error);
        // Continue without attachments rather than failing
      }
    }
    
    const toAddress = contato_nome ? `"${contato_nome}" <${to}>` : to;
    
    const emailPayload = {
      to: toAddress,
      subject: subject || "Sem assunto",
      html: finalContent,
      attachments: emailAttachments
    };
    
    try {
      let result;
      if (smtp_settings && smtp_settings.from_email) {
        console.log("Using SMTP for single email delivery");
        
        const smtpConfig = {
          host: smtp_settings.host || "",
          port: parseInt(smtp_settings.port) || 587,
          secure: smtp_settings.secure || false,
          user: smtp_settings.from_email,
          pass: smtp_settings.password,
          name: smtp_settings.from_name
        };
        
        result = await sendSingleEmail(
          emailPayload,
          true,
          smtpConfig,
          apiKey || "",
          smtp_settings.from_name || "RocketMail"
        );
      } else {
        console.log("Using Resend for single email delivery");
        result = await sendSingleEmail(
          emailPayload,
          false,
          null,
          apiKey || "",
          "RocketMail"
        );
      }
      
      console.log("Single email sent successfully:", result);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          id: result.id,
          provider: result.provider
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      console.error("Failed to send single email:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error occurred"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error in send-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
