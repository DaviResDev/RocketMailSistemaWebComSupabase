import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
 * Process template variables for a specific contact
 */
function processTemplateVariables(content: string, contactData: any): string {
  if (!content || !contactData) return content || '';
  
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('pt-BR');
  const formattedTime = currentDate.toLocaleTimeString('pt-BR');
  
  const replacements: Record<string, string> = {
    '{{nome}}': contactData?.nome || '',
    '{{email}}': contactData?.email || '',
    '{{telefone}}': contactData?.telefone || '',
    '{{razao_social}}': contactData?.razao_social || '',
    '{{cliente}}': contactData?.cliente || '',
    '{{empresa}}': contactData?.razao_social || 'Empresa',
    '{{cargo}}': contactData?.cargo || 'Cargo',
    '{{produto}}': contactData?.produto || 'Produto',
    '{{valor}}': contactData?.valor || 'Valor',
    '{{vencimento}}': contactData?.vencimento || 'Vencimento',
    '{{data}}': formattedDate,
    '{{hora}}': formattedTime
  };
  
  let processedContent = content;
  Object.entries(replacements).forEach(([variable, value]) => {
    processedContent = processedContent.split(variable).join(value);
  });
  
  return processedContent;
}

/**
 * Validate and sanitize attachment data
 */
function validateAndSanitizeAttachments(attachments: any): any[] {
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
 * Send email via SMTP using native Deno APIs
 */
async function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any> {
  try {
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.email_usuario || !smtpConfig.password) {
      throw new Error("SMTP configuração incompleta");
    }

    // Extract and validate recipient email
    const recipientEmail = extractEmailAddress(payload.to);
    if (!isValidEmail(recipientEmail)) {
      throw new Error(`Email inválido: ${payload.to}`);
    }

    const sanitizedSubject = sanitizeSubject(payload.subject);
    const fromEmail = smtpConfig.from_email || smtpConfig.email_usuario;
    const fromName = smtpConfig.from_name || smtpConfig.smtp_nome || 'RocketMail';
    
    console.log(`📧 Tentando envio SMTP para: ${recipientEmail}`);
    console.log(`📋 Config SMTP: ${smtpConfig.host}:${smtpConfig.port} (${fromEmail})`);
    
    // Validate SMTP settings
    if (!smtpConfig.port || (smtpConfig.port !== 587 && smtpConfig.port !== 465 && smtpConfig.port !== 25)) {
      throw new Error(`Porta SMTP inválida: ${smtpConfig.port}. Use 587 (TLS), 465 (SSL) ou 25`);
    }

    // Create email message in RFC 5322 format
    const boundary = `----boundary_${Date.now()}_${Math.random().toString(36)}`;
    
    let emailMessage = `From: "${fromName}" <${fromEmail}>\r\n`;
    emailMessage += `To: ${recipientEmail}\r\n`;
    emailMessage += `Subject: ${sanitizedSubject}\r\n`;
    emailMessage += `MIME-Version: 1.0\r\n`;
    
    // Check if we have attachments
    const validatedAttachments = validateAndSanitizeAttachments(payload.attachments);
    const hasAttachments = validatedAttachments.length > 0;
    
    if (hasAttachments) {
      emailMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
      
      // HTML content part
      emailMessage += `--${boundary}\r\n`;
      emailMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
      emailMessage += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
      emailMessage += `${payload.html}\r\n\r\n`;
      
      // Attachment parts
      for (const attachment of validatedAttachments) {
        emailMessage += `--${boundary}\r\n`;
        emailMessage += `Content-Type: ${attachment.contentType}\r\n`;
        emailMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        emailMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
        
        if (attachment.content) {
          const base64Content = attachment.content.includes('base64,') 
            ? attachment.content.split('base64,')[1] 
            : attachment.content;
          emailMessage += `${base64Content}\r\n\r\n`;
        }
      }
      
      emailMessage += `--${boundary}--\r\n`;
    } else {
      emailMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
      emailMessage += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
      emailMessage += `${payload.html}\r\n`;
    }

    // Connect to SMTP server
    const isSecure = smtpConfig.port === 465;
    let conn;
    
    try {
      if (isSecure) {
        conn = await Deno.connectTls({
          hostname: smtpConfig.host,
          port: smtpConfig.port,
        });
        console.log("✅ Conexão TLS estabelecida");
      } else {
        conn = await Deno.connect({
          hostname: smtpConfig.host,
          port: smtpConfig.port,
        });
        console.log("✅ Conexão TCP estabelecida");
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Helper function to read response
      async function readResponse(): Promise<string> {
        const buffer = new Uint8Array(4096);
        const n = await conn.read(buffer);
        if (n === null) throw new Error("Conexão SMTP fechada inesperadamente");
        return decoder.decode(buffer.subarray(0, n));
      }

      // Helper function to send command
      async function sendCommand(command: string): Promise<string> {
        console.log(`→ ${command.trim()}`);
        await conn.write(encoder.encode(command + "\r\n"));
        const response = await readResponse();
        console.log(`← ${response.trim()}`);
        return response;
      }

      // SMTP conversation
      let response = await readResponse(); // Welcome message
      console.log(`← ${response.trim()}`);
      
      if (!response.startsWith('220')) {
        throw new Error(`SMTP servidor rejeitou conexão: ${response}`);
      }

      // EHLO
      response = await sendCommand(`EHLO ${smtpConfig.host}`);
      if (!response.startsWith('250')) {
        throw new Error(`EHLO falhou: ${response}`);
      }

      // STARTTLS for non-SSL connections
      if (!isSecure && smtpConfig.port === 587) {
        response = await sendCommand("STARTTLS");
        if (!response.startsWith('220')) {
          throw new Error(`STARTTLS falhou: ${response}`);
        }
        
        // Upgrade to TLS
        const tlsConn = await Deno.startTls(conn, { hostname: smtpConfig.host });
        conn.close();
        conn = tlsConn;
        console.log("✅ Upgrade para TLS concluído");
        
        // Send EHLO again after TLS
        response = await sendCommand(`EHLO ${smtpConfig.host}`);
        if (!response.startsWith('250')) {
          throw new Error(`EHLO pós-TLS falhou: ${response}`);
        }
      }

      // AUTH LOGIN
      response = await sendCommand("AUTH LOGIN");
      if (!response.startsWith('334')) {
        throw new Error(`AUTH LOGIN falhou: ${response}`);
      }

      // Send username (base64 encoded)
      const username = btoa(smtpConfig.email_usuario);
      response = await sendCommand(username);
      if (!response.startsWith('334')) {
        throw new Error(`Autenticação usuário falhou: ${response}`);
      }

      // Send password (base64 encoded)
      const password = btoa(smtpConfig.password);
      response = await sendCommand(password);
      if (!response.startsWith('235')) {
        throw new Error(`Autenticação senha falhou: ${response}`);
      }

      console.log("✅ Autenticação SMTP bem-sucedida");

      // MAIL FROM
      response = await sendCommand(`MAIL FROM:<${fromEmail}>`);
      if (!response.startsWith('250')) {
        throw new Error(`MAIL FROM falhou: ${response}`);
      }

      // RCPT TO
      response = await sendCommand(`RCPT TO:<${recipientEmail}>`);
      if (!response.startsWith('250')) {
        throw new Error(`RCPT TO falhou: ${response}`);
      }

      // DATA
      response = await sendCommand("DATA");
      if (!response.startsWith('354')) {
        throw new Error(`DATA falhou: ${response}`);
      }

      // Send email content
      await conn.write(encoder.encode(emailMessage));
      response = await sendCommand(".");
      if (!response.startsWith('250')) {
        throw new Error(`Envio da mensagem falhou: ${response}`);
      }

      // QUIT
      await sendCommand("QUIT");
      conn.close();

      console.log("✅ Email enviado com sucesso via SMTP!");

      return {
        success: true,
        id: `smtp_${Date.now()}`,
        provider: "smtp",
        method: "SMTP Nativo",
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail,
        attachments: hasAttachments ? validatedAttachments.length : 0
      };

    } catch (connError) {
      if (conn) {
        try { conn.close(); } catch (e) { /* ignore */ }
      }
      throw connError;
    }

  } catch (error) {
    console.error("❌ Erro SMTP:", error.message);
    throw new Error(`Falha SMTP: ${error.message}`);
  }
}

/**
 * Process multiple emails in controlled batches using SMTP exclusively
 */
async function processBatchEmailsWithSMTP(emailRequests: any[], smtpConfig: any): Promise<any> {
  const batchSize = 20; // Batch size for SMTP to avoid overwhelming the server
  const delayBetweenBatches = 2000; // 2 seconds between batches
  const delayBetweenEmails = 1000; // 1 second between individual emails
  const results: any[] = [];
  
  console.log(`📬 Processando ${emailRequests.length} emails via SMTP em lotes de ${batchSize}`);
  console.log(`📧 Configuração SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
  
  for (let i = 0; i < emailRequests.length; i += batchSize) {
    const batch = emailRequests.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emailRequests.length / batchSize);
    
    console.log(`🔄 Processando lote ${batchNumber}/${totalBatches} (${batch.length} emails)`);
    
    // Process batch emails sequentially to respect SMTP rate limits
    for (let j = 0; j < batch.length; j++) {
      const emailData = batch[j];
      const globalIndex = i + j;
      
      try {
        console.log(`📤 Enviando email ${globalIndex + 1}/${emailRequests.length} para: ${emailData.to}`);
        
        const result = await sendEmailViaSMTP(smtpConfig, emailData);
        
        results.push({
          success: true,
          result: result,
          to: emailData.to,
          index: globalIndex,
          provider: result.provider,
          method: result.method
        });
        
        console.log(`✅ Email ${globalIndex + 1} enviado com sucesso`);
        
        // Add delay between emails within the batch
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
        }
        
      } catch (error) {
        console.error(`❌ Falha ao enviar email ${globalIndex + 1} para ${emailData.to}:`, error.message);
        results.push({
          success: false,
          error: error.message,
          to: emailData.to,
          index: globalIndex
        });
      }
    }
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < emailRequests.length) {
      console.log(`⏱️ Aguardando ${delayBetweenBatches}ms antes do próximo lote...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const smtpCount = results.filter(r => r.success && r.provider === 'smtp').length;
  
  console.log(`📊 Processamento em lote SMTP concluído:`);
  console.log(`   ✅ Total enviados: ${successCount}`);
  console.log(`   ❌ Total falharam: ${failureCount}`);
  console.log(`   📧 Via SMTP: ${smtpCount}`);
  
  return {
    results,
    summary: {
      total: emailRequests.length,
      successful: successCount,
      failed: failureCount,
      smtp: smtpCount,
      resend: 0, // No Resend usage when SMTP is enabled
      fallback: 0,
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
      console.log(`📬 Recebida solicitação de envio em lote para ${requestData.emails.length} destinatários`);
      console.log(`🔧 Use SMTP: ${requestData.use_smtp}`);
      console.log(`📧 SMTP configurado: ${!!requestData.smtp_settings}`);
      
      // Validate SMTP configuration when use_smtp is true
      if (requestData.use_smtp && !requestData.smtp_settings) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP ativado mas configurações não fornecidas"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      if (!requestData.use_smtp) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Envio em lote requer SMTP configurado. Por favor, configure o SMTP nas configurações."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      // Prepare SMTP configuration
      const smtpConfig = {
        host: requestData.smtp_settings.host,
        port: requestData.smtp_settings.port,
        email_usuario: requestData.smtp_settings.from_email,
        password: requestData.smtp_settings.password,
        from_email: requestData.smtp_settings.from_email,
        from_name: requestData.smtp_settings.from_name || 'RocketMail',
        smtp_nome: requestData.smtp_settings.from_name
      };
      
      // Build email requests with proper template processing
      const emailRequests = [];
      
      for (const emailData of requestData.emails) {
        try {
          // Get template content from database if template_id is provided
          let templateContent = emailData.content || '';
          let templateSubject = emailData.subject || 'Sem assunto';
          
          if (emailData.template_id) {
            console.log(`📋 Buscando template ${emailData.template_id} no banco de dados`);
            
            const { data: templateData, error: templateError } = await supabase
              .from('templates')
              .select('*')
              .eq('id', emailData.template_id)
              .single();
              
            if (templateError) {
              console.error(`Erro ao buscar template ${emailData.template_id}:`, templateError);
            } else if (templateData) {
              templateContent = templateData.conteudo || '';
              templateSubject = emailData.subject || templateData.descricao || templateData.nome || 'Sem assunto';
              console.log(`✅ Template ${emailData.template_id} carregado: ${templateData.nome}`);
            }
          }
          
          // Process template variables with contact data
          let processedContent = templateContent;
          if (emailData.contact) {
            processedContent = processTemplateVariables(templateContent, emailData.contact);
            console.log(`🔄 Variáveis processadas para contato: ${emailData.contact.nome}`);
          }
          
          // Build email HTML with proper structure
          let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeSubject(templateSubject)}</title>
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
      ${processedContent}
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
          
          emailRequests.push({
            to: toAddress,
            subject: sanitizeSubject(templateSubject),
            html: finalContent,
            attachments: emailData.attachments || []
          });
          
        } catch (error) {
          console.error(`Erro ao processar email para ${emailData.to}:`, error);
          // Continue processing other emails even if one fails
        }
      }
      
      console.log(`📨 Processados ${emailRequests.length} emails para envio via SMTP`);
      
      try {
        const batchResult = await processBatchEmailsWithSMTP(emailRequests, smtpConfig);
        
        console.log("📊 Processamento em lote SMTP concluído:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Processamento em lote SMTP concluído",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || 'smtp',
              method: r.method || 'SMTP Nativo'
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("❌ Falha no processamento em lote SMTP:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || "Falha no processamento em lote SMTP"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }
    
    // Handle single email sending (keep existing logic)
    const { 
      to, 
      subject, 
      content, 
      signature_image,
      attachments,
      contato_nome,
      image_url,
      smtp_settings,
      use_smtp,
      template_id,
      contact
    } = requestData;
    
    console.log("📧 Recebida solicitação de email único:", { 
      to, 
      subject, 
      contentLength: content?.length,
      hasSignatureImage: !!signature_image,
      hasAttachments: !!attachments,
      hasImageUrl: !!image_url,
      hasSmtpSettings: !!smtp_settings,
      useSmtp: use_smtp,
      templateId: template_id
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
    
    // Process template content if template_id is provided
    let finalTemplateContent = content || '';
    let finalSubject = subject || 'Sem assunto';
    
    if (template_id) {
      console.log(`📋 Buscando template ${template_id} para email único`);
      
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', template_id)
        .single();
        
      if (templateError) {
        console.error(`Erro ao buscar template ${template_id}:`, templateError);
      } else if (templateData) {
        finalTemplateContent = templateData.conteudo || content || '';
        finalSubject = subject || templateData.descricao || templateData.nome || 'Sem assunto';
        console.log(`✅ Template ${template_id} carregado para email único: ${templateData.nome}`);
      }
    }
    
    // Process template variables if contact data is provided
    if (contact && finalTemplateContent) {
      finalTemplateContent = processTemplateVariables(finalTemplateContent, contact);
      console.log(`🔄 Variáveis processadas para contato único: ${contact.nome}`);
    }
    
    // Build email HTML with proper structure
    let finalContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeSubject(finalSubject)}</title>
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
      ${finalTemplateContent}
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
        emailAttachments = validateAndSanitizeAttachments(attachments);
        console.log(`📎 Processados ${emailAttachments.length} anexos válidos`);
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
      subject: sanitizeSubject(finalSubject),
      html: finalContent,
      attachments: emailAttachments
    };
    
    try {
      // For single emails, use SMTP if configured
      if (use_smtp && smtp_settings) {
        const smtpConfig = {
          host: smtp_settings.host,
          port: smtp_settings.port,
          email_usuario: smtp_settings.from_email,
          password: smtp_settings.password,
          from_email: smtp_settings.from_email,
          from_name: smtp_settings.from_name || 'RocketMail',
          smtp_nome: smtp_settings.from_name
        };
        
        console.log(`📧 Enviando email único via SMTP configurado`);
        
        const result = await sendEmailViaSMTP(smtpConfig, emailPayload);
        
        console.log("✅ Email único enviado com sucesso via SMTP:", result);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email enviado com sucesso via SMTP",
            id: result.id,
            provider: result.provider,
            method: result.method
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP não configurado. Configure o SMTP nas configurações para enviar emails."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    } catch (error) {
      console.error("❌ Falha ao enviar email único:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Erro ao enviar email"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("❌ Erro não tratado na função send-email:", error);
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
