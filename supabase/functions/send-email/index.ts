
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
 * Sanitize subject line for email providers
 */
function sanitizeSubject(subject: string): string {
  if (!subject) return '';
  
  return subject
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
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
 * Send email via native SMTP using Deno's native APIs
 */
async function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any> {
  try {
    console.log("🔄 Attempting native SMTP delivery");
    
    // Extract and validate recipient email
    const recipientEmail = extractEmailAddress(payload.to);
    if (!isValidEmail(recipientEmail)) {
      throw new Error(`Email inválido: ${payload.to}`);
    }
    
    // Use configured SMTP settings for from field
    const fromName = smtpConfig.from_name || smtpConfig.smtp_nome || 'RocketMail';
    const fromEmail = smtpConfig.from_email || smtpConfig.email_usuario;
    
    if (!fromEmail) {
      throw new Error("Email do remetente não configurado nas configurações SMTP");
    }
    
    const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    const sanitizedSubject = sanitizeSubject(payload.subject);
    
    console.log(`📧 Connecting to SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
    
    // Connect to SMTP server using Deno's native TCP
    const conn = await Deno.connect({
      hostname: smtpConfig.host,
      port: smtpConfig.port,
    });
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let buffer = new Uint8Array(1024);
    
    // Read SMTP greeting
    const bytesRead = await conn.read(buffer);
    if (bytesRead === null) throw new Error("Failed to read SMTP greeting");
    const greeting = decoder.decode(buffer.subarray(0, bytesRead));
    console.log("SMTP greeting:", greeting);
    
    if (!greeting.startsWith('220')) {
      throw new Error(`SMTP connection failed: ${greeting}`);
    }
    
    // Send EHLO
    const ehloCommand = `EHLO ${smtpConfig.host}\r\n`;
    await conn.write(encoder.encode(ehloCommand));
    
    buffer = new Uint8Array(1024);
    const ehloResponse = await conn.read(buffer);
    if (ehloResponse === null) throw new Error("Failed to read EHLO response");
    const ehloText = decoder.decode(buffer.subarray(0, ehloResponse));
    console.log("EHLO response:", ehloText);
    
    // Start TLS if needed (port 587)
    if (smtpConfig.port === 587) {
      await conn.write(encoder.encode("STARTTLS\r\n"));
      
      buffer = new Uint8Array(1024);
      const tlsResponse = await conn.read(buffer);
      if (tlsResponse === null) throw new Error("Failed to read STARTTLS response");
      const tlsText = decoder.decode(buffer.subarray(0, tlsResponse));
      console.log("STARTTLS response:", tlsText);
      
      if (!tlsText.startsWith('220')) {
        throw new Error(`STARTTLS failed: ${tlsText}`);
      }
      
      // Close current connection and establish TLS connection
      conn.close();
      
      // For now, we'll throw an error for TLS as it requires more complex implementation
      throw new Error("TLS/STARTTLS não suportado ainda - use porta 25 sem TLS ou aguarde implementação completa");
    }
    
    // AUTH LOGIN (Base64 encoded)
    const username = btoa(smtpConfig.email_usuario);
    const password = btoa(smtpConfig.password);
    
    await conn.write(encoder.encode("AUTH LOGIN\r\n"));
    buffer = new Uint8Array(1024);
    let authResponse = await conn.read(buffer);
    if (authResponse === null) throw new Error("Failed to read AUTH response");
    let authText = decoder.decode(buffer.subarray(0, authResponse));
    console.log("AUTH response:", authText);
    
    if (!authText.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${authText}`);
    }
    
    // Send username
    await conn.write(encoder.encode(`${username}\r\n`));
    buffer = new Uint8Array(1024);
    authResponse = await conn.read(buffer);
    if (authResponse === null) throw new Error("Failed to read username response");
    authText = decoder.decode(buffer.subarray(0, authResponse));
    
    if (!authText.startsWith('334')) {
      throw new Error(`Username authentication failed: ${authText}`);
    }
    
    // Send password
    await conn.write(encoder.encode(`${password}\r\n`));
    buffer = new Uint8Array(1024);
    authResponse = await conn.read(buffer);
    if (authResponse === null) throw new Error("Failed to read password response");
    authText = decoder.decode(buffer.subarray(0, authResponse));
    
    if (!authText.startsWith('235')) {
      throw new Error(`Password authentication failed: ${authText}`);
    }
    
    console.log("✅ SMTP Authentication successful");
    
    // Send MAIL FROM
    await conn.write(encoder.encode(`MAIL FROM:<${fromEmail}>\r\n`));
    buffer = new Uint8Array(1024);
    const mailFromResponse = await conn.read(buffer);
    if (mailFromResponse === null) throw new Error("Failed to read MAIL FROM response");
    const mailFromText = decoder.decode(buffer.subarray(0, mailFromResponse));
    
    if (!mailFromText.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${mailFromText}`);
    }
    
    // Send RCPT TO
    await conn.write(encoder.encode(`RCPT TO:<${recipientEmail}>\r\n`));
    buffer = new Uint8Array(1024);
    const rcptResponse = await conn.read(buffer);
    if (rcptResponse === null) throw new Error("Failed to read RCPT TO response");
    const rcptText = decoder.decode(buffer.subarray(0, rcptResponse));
    
    if (!rcptText.startsWith('250')) {
      throw new Error(`RCPT TO failed: ${rcptText}`);
    }
    
    // Send DATA
    await conn.write(encoder.encode("DATA\r\n"));
    buffer = new Uint8Array(1024);
    const dataResponse = await conn.read(buffer);
    if (dataResponse === null) throw new Error("Failed to read DATA response");
    const dataText = decoder.decode(buffer.subarray(0, dataResponse));
    
    if (!dataText.startsWith('354')) {
      throw new Error(`DATA command failed: ${dataText}`);
    }
    
    // Build email content
    const emailContent = [
      `From: ${from}`,
      `To: ${recipientEmail}`,
      `Subject: ${sanitizedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      payload.html,
      ``,
      `.`,
      ``
    ].join('\r\n');
    
    // Send email content
    await conn.write(encoder.encode(emailContent));
    
    buffer = new Uint8Array(1024);
    const sendResponse = await conn.read(buffer);
    if (sendResponse === null) throw new Error("Failed to read send response");
    const sendText = decoder.decode(buffer.subarray(0, sendResponse));
    
    if (!sendText.startsWith('250')) {
      throw new Error(`Email send failed: ${sendText}`);
    }
    
    // Send QUIT
    await conn.write(encoder.encode("QUIT\r\n"));
    conn.close();
    
    console.log("✅ Email sent successfully via native SMTP");
    
    const messageId = `smtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      id: messageId,
      provider: "smtp",
      method: "Native SMTP (Deno)",
      from: fromEmail,
      to: recipientEmail,
    };
  } catch (error) {
    console.error("❌ Native SMTP Error:", error);
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
    
    // Sanitize subject to remove newlines and other problematic characters
    const sanitizedSubject = sanitizeSubject(payload.subject);
    
    const emailData: any = {
      from: `${fromName || 'RocketMail'} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: sanitizedSubject,
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
    
    console.log(`📤 Sending email via Resend to: ${recipientEmail}`);
    
    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || "Erro desconhecido no Resend");
    }
    
    console.log("✅ Email sent successfully via Resend:", result.data?.id);
    return {
      success: true,
      id: result.data?.id,
      provider: "resend",
      method: "Resend API",
      from: emailData.from,
      to: recipientEmail,
      reply_to: emailData.reply_to,
    };
  } catch (error) {
    console.error("❌ Resend Error details:", {
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
 * Send single email with SMTP priority and Resend fallback
 */
async function sendSingleEmail(payload: any, smtpConfig: any, resendConfig: any, useSmtp: boolean): Promise<any> {
  let smtpError = null;
  
  try {
    console.log(`📧 Sending email with strategy: ${useSmtp ? 'Native SMTP-first with Resend fallback' : 'Resend-only'}`);
    
    // Try native SMTP first if enabled and configured
    if (useSmtp && smtpConfig) {
      try {
        console.log("🔄 Attempting native SMTP delivery...");
        const result = await sendEmailViaSMTP(smtpConfig, payload);
        console.log("✅ Native SMTP delivery successful!");
        return result;
      } catch (error) {
        smtpError = error;
        console.warn("⚠️ Native SMTP failed, will attempt Resend fallback:", error.message);
        
        // Continue to Resend fallback
      }
    }
    
    // Use Resend (either as primary method or as fallback)
    if (resendConfig && resendConfig.apiKey) {
      try {
        console.log(useSmtp && smtpError ? "🔄 Using Resend as fallback..." : "🔄 Using Resend as primary method...");
        const result = await sendEmailViaResend(
          resendConfig.apiKey,
          resendConfig.fromName || 'RocketMail',
          resendConfig.replyTo,
          payload
        );
        
        // Mark as fallback if SMTP was attempted first
        if (useSmtp && smtpError) {
          result.fallback = true;
          result.originalError = smtpError.message;
          console.log("✅ Resend fallback successful!");
        } else {
          console.log("✅ Resend delivery successful!");
        }
        
        return result;
      } catch (resendError) {
        console.error("❌ Resend also failed:", resendError.message);
        
        // If both SMTP and Resend failed, throw the more relevant error
        if (smtpError) {
          throw new Error(`SMTP falhou (${smtpError.message}) e Resend também falhou (${resendError.message})`);
        } else {
          throw resendError;
        }
      }
    }
    
    // No delivery method available
    if (useSmtp && !smtpConfig) {
      throw new Error('SMTP ativado mas não configurado corretamente');
    } else {
      throw new Error('Nenhum método de envio configurado (Resend não disponível)');
    }
    
  } catch (error) {
    console.error("❌ Error in sendSingleEmail:", error);
    throw error;
  }
}

/**
 * Process multiple emails in parallel batches
 */
async function processBatchEmails(emailRequests: any[], smtpConfig: any, resendConfig: any, useSmtp: boolean): Promise<any> {
  const batchSize = 50;
  const delayBetweenBatches = 1000;
  const results: any[] = [];
  
  console.log(`📬 Processing ${emailRequests.length} emails in batches of ${batchSize}`);
  console.log(`📋 Email strategy: ${useSmtp ? 'Native SMTP-first with Resend fallback' : 'Resend-only'}`);
  
  for (let i = 0; i < emailRequests.length; i += batchSize) {
    const batch = emailRequests.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emailRequests.length / batchSize);
    
    console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
    
    // Process batch with Promise.all for parallel execution
    const batchPromises = batch.map(async (emailData, index) => {
      const globalIndex = i + index;
      try {
        console.log(`📤 Sending email ${globalIndex + 1}/${emailRequests.length} to: ${emailData.to}`);
        
        const result = await sendSingleEmail(emailData, smtpConfig, resendConfig, useSmtp);
        
        return {
          success: true,
          result: result,
          to: emailData.to,
          index: globalIndex,
          provider: result.provider,
          method: result.method,
          fallback: result.fallback || false
        };
      } catch (error) {
        console.error(`❌ Failed to send email ${globalIndex + 1} to ${emailData.to}:`, error.message);
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
      console.log(`⏱️ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const fallbackCount = results.filter(r => r.success && r.fallback).length;
  const smtpCount = results.filter(r => r.success && r.provider === 'smtp').length;
  const resendCount = results.filter(r => r.success && r.provider === 'resend').length;
  
  console.log(`📊 Batch processing complete:`);
  console.log(`   ✅ Total successful: ${successCount}`);
  console.log(`   ❌ Total failed: ${failureCount}`);
  console.log(`   📧 Via native SMTP: ${smtpCount}`);
  console.log(`   📨 Via Resend: ${resendCount}`);
  console.log(`   🔄 Fallback used: ${fallbackCount}`);
  
  return {
    results,
    summary: {
      total: emailRequests.length,
      successful: successCount,
      failed: failureCount,
      fallback: fallbackCount,
      smtp: smtpCount,
      resend: resendCount,
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
      console.log(`📬 Received batch email request for ${requestData.emails.length} recipients`);
      
      // Build email requests
      const emailRequests = requestData.emails.map(emailData => {
        
        // Build email HTML with proper structure
        let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeSubject(emailData.subject || "Email")}</title>
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
          subject: sanitizeSubject(emailData.subject || "Sem assunto"),
          html: finalContent,
          attachments: emailData.attachments || []
        };
      });
      
      try {
        // Determine configuration based on user settings
        const useSmtp = requestData.use_smtp === true;
        
        // Prepare native SMTP configuration
        let smtpConfig = null;
        if (useSmtp && requestData.smtp_settings) {
          smtpConfig = {
            host: requestData.smtp_settings.host,
            port: requestData.smtp_settings.port,
            email_usuario: requestData.smtp_settings.from_email,
            password: requestData.smtp_settings.password,
            from_email: requestData.smtp_settings.from_email,
            from_name: requestData.smtp_settings.from_name || 'RocketMail',
            smtp_nome: requestData.smtp_settings.from_name
          };
        }
        
        // Prepare Resend configuration
        const resendConfig = {
          apiKey: resendApiKey || "",
          fromName: requestData.smtp_settings?.from_name || "RocketMail",
          replyTo: requestData.smtp_settings?.from_email
        };
        
        console.log(`📋 Configuration:`);
        console.log(`   🔧 Use SMTP: ${useSmtp}`);
        console.log(`   📧 Native SMTP configured: ${!!smtpConfig}`);
        console.log(`   📨 Resend available: ${!!resendApiKey}`);
        
        if (useSmtp && !smtpConfig) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "SMTP ativado mas configurações SMTP não fornecidas"
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
        
        if (!smtpConfig && !resendApiKey) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Nenhum serviço de email configurado. Configure SMTP ou Resend."
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
        
        const batchResult = await processBatchEmails(emailRequests, smtpConfig, resendConfig, useSmtp);
        
        console.log("📊 Batch email processing completed:", batchResult.summary);
        
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
              method: r.method || null,
              fallback: r.fallback || false
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("❌ Batch email processing failed:", error);
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
    
    console.log("📧 Received single email request:", { 
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
  <title>${sanitizeSubject(subject || "Email")}</title>
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
        console.log(`📎 Processed ${emailAttachments.length} valid attachments`);
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
      subject: sanitizeSubject(subject || "Sem assunto"),
      html: finalContent,
      attachments: emailAttachments
    };
    
    try {
      // Determine configuration based on user settings
      const useSmtpDelivery = use_smtp === true;
      
      // Prepare native SMTP configuration
      let smtpConfig = null;
      if (useSmtpDelivery && smtp_settings) {
        smtpConfig = {
          host: smtp_settings.host,
          port: smtp_settings.port,
          email_usuario: smtp_settings.from_email,
          password: smtp_settings.password,
          from_email: smtp_settings.from_email,
          from_name: smtp_settings.from_name || 'RocketMail',
          smtp_nome: smtp_settings.from_name
        };
      }
      
      // Prepare Resend configuration
      const resendConfig = {
        apiKey: resendApiKey || "",
        fromName: smtp_settings?.from_name || "RocketMail",
        replyTo: smtp_settings?.from_email
      };
      
      console.log(`📋 Single email configuration:`);
      console.log(`   🔧 Use SMTP: ${useSmtpDelivery}`);
      console.log(`   📧 Native SMTP configured: ${!!smtpConfig}`);
      console.log(`   📨 Resend available: ${!!resendApiKey}`);
      
      if (useSmtpDelivery && !smtpConfig) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP ativado mas configurações SMTP não fornecidas"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      if (!smtpConfig && !resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nenhum serviço de email configurado. Configure SMTP ou Resend."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      const result = await sendSingleEmail(emailPayload, smtpConfig, resendConfig, useSmtpDelivery);
      
      console.log("✅ Single email sent successfully:", result);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email enviado com sucesso",
          id: result.id,
          provider: result.provider,
          method: result.method,
          fallback: result.fallback || false,
          originalError: result.originalError || null
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      console.error("❌ Failed to send single email:", error);
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
    console.error("❌ Unhandled error in send-email function:", error);
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
