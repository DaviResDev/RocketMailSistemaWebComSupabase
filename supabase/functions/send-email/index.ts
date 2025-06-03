
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
 * Email validation function
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Handle both formats: "Name <email@domain.com>" and "email@domain.com"
  const emailRegex = /^(?:"?([^"]*)"?\s*<([^>]+)>|([^<>\s]+))$/;
  const match = email.match(emailRegex);
  
  if (!match) return false;
  
  // Extract the actual email address
  const actualEmail = match[2] || match[3];
  if (!actualEmail) return false;
  
  // Validate the email format
  const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validEmailRegex.test(actualEmail.trim());
}

/**
 * Extract email address from formatted string
 */
function extractEmailAddress(email: string): string {
  if (!email) return '';
  
  const emailRegex = /^(?:"?([^"]*)"?\s*<([^>]+)>|([^<>\s]+))$/;
  const match = email.match(emailRegex);
  
  if (match) {
    return match[2] || match[3] || '';
  }
  
  return email.trim();
}

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
 * Send email via SMTP using external service
 */
async function sendEmailViaSMTP(config: any, payload: any): Promise<any> {
  try {
    console.log("Attempting SMTP send via external service");
    
    const fromName = config.name || config.user.split('@')[0];
    const fromEmail = config.user;
    const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    
    // Extract and validate recipient email
    const recipientEmail = extractEmailAddress(payload.to);
    if (!isValidEmail(recipientEmail)) {
      throw new Error(`Email inválido: ${payload.to}`);
    }
    
    // Use SMTP2GO API for better reliability in serverless environments
    const smtp2goApiKey = Deno.env.get("SMTP2GO_API_KEY");
    
    if (!smtp2goApiKey) {
      console.log("SMTP2GO API key not found, falling back to basic SMTP simulation");
      throw new Error("SMTP2GO não configurado. Configure a chave API ou use Resend como alternativa.");
    }
    
    // Prepare email data for SMTP2GO
    const emailData = {
      api_key: smtp2goApiKey,
      to: [recipientEmail],
      sender: fromEmail,
      subject: payload.subject,
      html_body: payload.html,
      text_body: stripHtml(payload.html),
    };
    
    if (payload.cc && payload.cc.length > 0) {
      emailData.cc = payload.cc;
    }
    
    if (payload.bcc && payload.bcc.length > 0) {
      emailData.bcc = payload.bcc;
    }
    
    // Process attachments for SMTP2GO
    if (payload.attachments && payload.attachments.length > 0) {
      const validatedAttachments = validateAndSanitizeAttachments(payload.attachments, false);
      
      if (validatedAttachments.length > 0) {
        emailData.attachments = validatedAttachments.map(attachment => ({
          filename: attachment.filename,
          fileblob: attachment.content, // SMTP2GO expects base64 content
          mimetype: attachment.contentType
        }));
        console.log(`Adding ${emailData.attachments.length} attachments to SMTP email`);
      }
    }
    
    console.log(`Sending email via SMTP2GO to: ${recipientEmail}`);
    
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });
    
    const result = await response.json();
    
    if (!response.ok || result.data?.error) {
      throw new Error(result.data?.error || `SMTP2GO Error: ${response.status}`);
    }
    
    console.log("Email sent successfully via SMTP2GO:", result.data?.email_id);
    
    return {
      success: true,
      id: result.data?.email_id,
      provider: "smtp2go",
      from: fromEmail,
      to: recipientEmail,
    };
  } catch (error) {
    console.error("SMTP Error:", error);
    throw error;
  }
}

/**
 * Send email via Resend API with proper validation
 */
async function sendEmailViaResend(resendApiKey: string, fromName: string, replyTo: string, payload: any): Promise<any> {
  try {
    const resend = new Resend(resendApiKey);
    
    if (!resendApiKey || resendApiKey.trim() === '') {
      throw new Error("Chave da API Resend não configurada");
    }
    
    // Extract and validate recipient email
    const recipientEmail = extractEmailAddress(payload.to);
    if (!isValidEmail(recipientEmail)) {
      throw new Error(`Email inválido: ${payload.to}`);
    }
    
    const emailData: any = {
      from: `${fromName || 'RocketMail'} <onboarding@resend.dev>`,
      to: [recipientEmail],
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
            throw new Error(`Conteúdo inválido para anexo: ${attachment.filename}`);
          }
          
          if (!content || content.trim() === '') {
            throw new Error(`Conteúdo vazio para anexo: ${attachment.filename}`);
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
    
    console.log(`Sending email via Resend to: ${recipientEmail}`);
    
    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || "Erro desconhecido no Resend");
    }
    
    console.log("Email sent successfully via Resend:", result.data?.id);
    return {
      success: true,
      id: result.data?.id,
      provider: "resend",
      from: emailData.from,
      to: recipientEmail,
      reply_to: emailData.reply_to,
    };
  } catch (error) {
    console.error("Resend Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Provide specific error messages for Resend
    if (error.message.includes('Too many requests')) {
      throw new Error(`Limite de envios Resend excedido: ${error.message}`);
    } else if (error.message.includes('domain')) {
      throw new Error(`Erro de domínio Resend: Verifique a configuração do domínio`);
    } else if (error.message.includes('Email inválido')) {
      throw error; // Re-throw validation error as is
    } else {
      throw new Error(`Erro Resend: ${error.message || 'Erro desconhecido no Resend'}`);
    }
  }
}

/**
 * Send single email based on user configuration with smart fallback
 */
async function sendSingleEmail(payload: any, config: any): Promise<any> {
  try {
    console.log("Sending single email with preferred method:", config.preferredMethod);
    
    // Try SMTP first if configured and preferred
    if (config.preferredMethod === 'smtp' && config.smtp) {
      try {
        console.log("Attempting SMTP delivery...");
        return await sendEmailViaSMTP(config.smtp, payload);
      } catch (smtpError) {
        console.warn("SMTP failed, falling back to Resend:", smtpError.message);
        
        // If SMTP fails, try Resend as fallback
        if (config.resend && config.resend.apiKey) {
          console.log("Using Resend as fallback...");
          const result = await sendEmailViaResend(
            config.resend.apiKey, 
            config.resend.fromName || 'RocketMail', 
            config.resend.replyTo, 
            payload
          );
          
          // Mark as fallback in result
          result.fallback = true;
          result.originalError = smtpError.message;
          return result;
        } else {
          throw new Error(`SMTP falhou e Resend não está configurado: ${smtpError.message}`);
        }
      }
    }
    
    // Use Resend as primary method
    if (config.preferredMethod === 'resend' && config.resend && config.resend.apiKey) {
      console.log("Using Resend as primary method...");
      return await sendEmailViaResend(
        config.resend.apiKey,
        config.resend.fromName || 'RocketMail',
        config.resend.replyTo,
        payload
      );
    }
    
    throw new Error('Nenhum método de envio configurado corretamente');
  } catch (error) {
    console.error("Error in sendSingleEmail:", error);
    throw error;
  }
}

/**
 * Process multiple emails in parallel batches
 */
async function processBatchEmails(emailRequests: any[], config: any): Promise<any> {
  const batchSize = 50;
  const delayBetweenBatches = 1000;
  const results: any[] = [];
  
  console.log(`Processing ${emailRequests.length} emails in batches of ${batchSize} using preferred method: ${config.preferredMethod}`);
  
  for (let i = 0; i < emailRequests.length; i += batchSize) {
    const batch = emailRequests.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emailRequests.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
    
    // Process batch with Promise.all for parallel execution
    const batchPromises = batch.map(async (emailData, index) => {
      const globalIndex = i + index;
      try {
        console.log(`Sending email ${globalIndex + 1}/${emailRequests.length} to: ${emailData.to}`);
        
        const result = await sendSingleEmail(emailData, config);
        
        return {
          success: true,
          result: result,
          to: emailData.to,
          index: globalIndex,
          provider: result.provider,
          fallback: result.fallback || false
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
  const fallbackCount = results.filter(r => r.success && r.fallback).length;
  
  console.log(`Batch processing complete: ${successCount} successful, ${failureCount} failed, ${fallbackCount} via fallback`);
  
  return {
    results,
    summary: {
      total: emailRequests.length,
      successful: successCount,
      failed: failureCount,
      fallback: fallbackCount,
      successRate: emailRequests.length > 0 ? ((successCount / emailRequests.length) * 100).toFixed(1) : "0"
    }
  };
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const smtp2goApiKey = Deno.env.get("SMTP2GO_API_KEY");
    
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Formato de dados da solicitação inválido"
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
        
        // Build email HTML with proper structure
        let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailData.subject || "Email"}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #333333; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto;">`;
        
        if (emailData.image_url) {
          finalContent += `
    <div style="margin-bottom: 20px;">
      <img src="${emailData.image_url}" alt="Header image" style="max-width: 100%; height: auto;" />
    </div>`;
        }
        
        finalContent += `
    <div style="margin-bottom: 20px;">
      ${emailData.content || ""}
    </div>`;
        
        if (emailData.signature_image && emailData.signature_image !== 'no_signature') {
          finalContent += `
    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
      <img src="${emailData.signature_image}" alt="Assinatura" style="max-height: 100px;" />
    </div>`;
        }
        
        finalContent += `
  </div>
</body>
</html>`;
        
        // Format the recipient email properly
        let toAddress = emailData.to;
        if (emailData.contato_nome && !toAddress.includes('<')) {
          toAddress = `"${emailData.contato_nome}" <${emailData.to}>`;
        }
        
        return {
          to: toAddress,
          subject: emailData.subject || "Sem assunto",
          html: finalContent,
          attachments: emailData.attachments || []
        };
      });
      
      try {
        // Determine configuration based on user settings
        let config: any = {
          preferredMethod: 'resend', // Default to Resend
          resend: {
            apiKey: resendApiKey || "",
            fromName: requestData.smtp_settings?.from_name || "RocketMail",
            replyTo: requestData.smtp_settings?.from_email
          }
        };
        
        // Check if user wants to use SMTP and it's available
        if (requestData.smtp_settings && requestData.use_smtp) {
          console.log("User requested SMTP delivery");
          
          if (smtp2goApiKey) {
            config.preferredMethod = 'smtp';
            config.smtp = {
              host: requestData.smtp_settings.host || 'smtp.gmail.com',
              port: requestData.smtp_settings.port || 587,
              secure: requestData.smtp_settings.secure || false,
              user: requestData.smtp_settings.from_email,
              pass: requestData.smtp_settings.password,
              name: requestData.smtp_settings.from_name || 'RocketMail'
            };
            console.log("SMTP2GO available, will attempt SMTP delivery with Resend fallback");
          } else {
            console.warn("SMTP requested but SMTP2GO API key not available, using Resend");
          }
        }
        
        if (!resendApiKey && config.preferredMethod === 'resend') {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Nenhum serviço de email configurado. Configure Resend ou SMTP2GO."
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
        
        const batchResult = await processBatchEmails(emailRequests, config);
        
        console.log("Batch email processing completed:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Processamento em lote concluído",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || null,
              fallback: r.fallback || false
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
            error: error.message || "Falha no processamento em lote"
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
      smtp_settings,
      use_smtp
    } = requestData;
    
    console.log("Received single email request:", { 
      to, 
      subject, 
      contentLength: content?.length,
      hasSignatureImage: !!signature_image,
      hasAttachments: !!attachments,
      hasImageUrl: !!image_url,
      hasSmtpSettings: !!smtp_settings,
      useSmtp: use_smtp
    });
    
    if (!to) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email do destinatário é obrigatório"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Validate recipient email
    if (!isValidEmail(to)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email inválido: ${to}`
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
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
      ${content || ""}
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
    if (attachments) {
      try {
        emailAttachments = validateAndSanitizeAttachments(attachments, !use_smtp);
        console.log(`Processed ${emailAttachments.length} valid attachments`);
      } catch (error) {
        console.error("Error processing attachments:", error);
        // Continue without attachments rather than failing
      }
    }
    
    // Format the recipient email properly
    let toAddress = to;
    if (contato_nome && !to.includes('<')) {
      toAddress = `"${contato_nome}" <${to}>`;
    }
    
    const emailPayload = {
      to: toAddress,
      subject: subject || "Sem assunto",
      html: finalContent,
      attachments: emailAttachments
    };
    
    try {
      // Determine configuration based on user settings
      let config: any = {
        preferredMethod: 'resend', // Default to Resend
        resend: {
          apiKey: resendApiKey || "",
          fromName: smtp_settings?.from_name || "RocketMail",
          replyTo: smtp_settings?.from_email
        }
      };
      
      // Check if user wants to use SMTP and it's available
      if (smtp_settings && use_smtp) {
        console.log("User requested SMTP delivery");
        
        if (smtp2goApiKey) {
          config.preferredMethod = 'smtp';
          config.smtp = {
            host: smtp_settings.host || 'smtp.gmail.com',
            port: smtp_settings.port || 587,
            secure: smtp_settings.secure || false,
            user: smtp_settings.from_email,
            pass: smtp_settings.password,
            name: smtp_settings.from_name || 'RocketMail'
          };
          console.log("SMTP2GO available, will attempt SMTP delivery with Resend fallback");
        } else {
          console.warn("SMTP requested but SMTP2GO API key not available, using Resend");
        }
      }
      
      if (!resendApiKey && config.preferredMethod === 'resend') {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nenhum serviço de email configurado. Configure Resend ou SMTP2GO."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      const result = await sendSingleEmail(emailPayload, config);
      
      console.log("Single email sent successfully:", result);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email enviado com sucesso",
          id: result.id,
          provider: result.provider,
          fallback: result.fallback || false,
          originalError: result.originalError || null
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
          error: error.message || "Erro desconhecido"
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
        error: "Erro interno do servidor"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
