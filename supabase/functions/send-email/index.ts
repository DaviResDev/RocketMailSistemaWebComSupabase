
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
 * Validate SMTP configuration and normalize settings
 */
function validateAndNormalizeSMTPConfig(smtpSettings: any): any {
  if (!smtpSettings || !smtpSettings.host) {
    throw new Error("SMTP host é obrigatório");
  }
  
  if (!smtpSettings.email_usuario && !smtpSettings.from_email) {
    throw new Error("Email do usuário é obrigatório");
  }
  
  if (!smtpSettings.password && !smtpSettings.smtp_pass) {
    throw new Error("Senha SMTP é obrigatória");
  }
  
  const port = parseInt(smtpSettings.port) || 587;
  const host = smtpSettings.host.trim();
  const email = smtpSettings.email_usuario || smtpSettings.from_email;
  const password = smtpSettings.password || smtpSettings.smtp_pass;
  const fromName = smtpSettings.from_name || smtpSettings.smtp_nome || 'RocketMail';
  
  // Auto-detect SSL/TLS based on port if not specified
  let isSecure = false;
  if (port === 465) {
    isSecure = true; // SSL
  } else if (port === 587 || port === 25) {
    isSecure = false; // TLS/STARTTLS
  } else {
    console.warn(`Porta SMTP não padrão: ${port}. Assumindo TLS.`);
  }
  
  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error(`Email inválido: ${email}`);
  }
  
  console.log(`✅ Configuração SMTP validada: ${host}:${port} (${isSecure ? 'SSL' : 'TLS'}) para ${email}`);
  
  return {
    host,
    port,
    email,
    password,
    fromName,
    isSecure
  };
}

/**
 * Send email via SMTP using native Deno APIs with improved error handling
 */
async function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any> {
  let conn;
  
  try {
    // Validate and normalize SMTP configuration
    const config = validateAndNormalizeSMTPConfig(smtpConfig);
    
    // Extract and validate recipient email
    const recipientEmail = extractEmailAddress(payload.to);
    if (!isValidEmail(recipientEmail)) {
      throw new Error(`Email destinatário inválido: ${payload.to}`);
    }

    const sanitizedSubject = sanitizeSubject(payload.subject);
    
    console.log(`📧 Enviando SMTP para: ${recipientEmail}`);
    console.log(`🔧 Servidor: ${config.host}:${config.port} (${config.isSecure ? 'SSL' : 'TLS'})`);
    console.log(`👤 Remetente: ${config.fromName} <${config.email}>`);

    // Create email message in RFC 5322 format
    const boundary = `----boundary_${Date.now()}_${Math.random().toString(36)}`;
    
    let emailMessage = `From: "${config.fromName}" <${config.email}>\r\n`;
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

    // Connect to SMTP server with proper SSL/TLS handling
    try {
      if (config.isSecure) {
        // Direct SSL connection (port 465)
        conn = await Deno.connectTls({
          hostname: config.host,
          port: config.port,
        });
        console.log("✅ Conexão SSL estabelecida");
      } else {
        // Plain connection for STARTTLS (ports 587, 25)
        conn = await Deno.connect({
          hostname: config.host,
          port: config.port,
        });
        console.log("✅ Conexão TCP estabelecida");
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Helper function to read response with timeout
      async function readResponse(timeoutMs = 10000): Promise<string> {
        const buffer = new Uint8Array(4096);
        
        const readPromise = conn.read(buffer);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms na leitura SMTP`)), timeoutMs);
        });
        
        const n = await Promise.race([readPromise, timeoutPromise]);
        if (n === null) throw new Error("Conexão SMTP fechada inesperadamente");
        return decoder.decode(buffer.subarray(0, n));
      }

      // Helper function to send command with logging
      async function sendCommand(command: string, hideLog = false): Promise<string> {
        if (!hideLog) {
          console.log(`→ ${command.trim()}`);
        } else {
          console.log(`→ [COMANDO OCULTO]`);
        }
        await conn.write(encoder.encode(command + "\r\n"));
        const response = await readResponse();
        if (!hideLog) {
          console.log(`← ${response.trim()}`);
        }
        return response;
      }

      // SMTP conversation
      let response = await readResponse(); // Welcome message
      console.log(`← ${response.trim()}`);
      
      if (!response.startsWith('220')) {
        throw new Error(`SMTP servidor rejeitou conexão: ${response.trim()}`);
      }

      // EHLO
      response = await sendCommand(`EHLO ${config.host}`);
      if (!response.startsWith('250')) {
        throw new Error(`EHLO falhou: ${response.trim()}`);
      }

      // STARTTLS for non-SSL connections (port 587, 25)
      if (!config.isSecure && config.port === 587) {
        response = await sendCommand("STARTTLS");
        if (!response.startsWith('220')) {
          throw new Error(`STARTTLS falhou: ${response.trim()}`);
        }
        
        // Upgrade to TLS
        const tlsConn = await Deno.startTls(conn, { hostname: config.host });
        conn.close();
        conn = tlsConn;
        console.log("✅ Upgrade para TLS concluído");
        
        // Send EHLO again after TLS
        response = await sendCommand(`EHLO ${config.host}`);
        if (!response.startsWith('250')) {
          throw new Error(`EHLO pós-TLS falhou: ${response.trim()}`);
        }
      }

      // AUTH LOGIN
      response = await sendCommand("AUTH LOGIN");
      if (!response.startsWith('334')) {
        throw new Error(`AUTH LOGIN falhou: ${response.trim()}`);
      }

      // Send username (base64 encoded)
      const username = btoa(config.email);
      response = await sendCommand(username, true);
      if (!response.startsWith('334')) {
        throw new Error(`Autenticação usuário falhou: ${response.trim()}`);
      }

      // Send password (base64 encoded)
      const password = btoa(config.password);
      response = await sendCommand(password, true);
      if (!response.startsWith('235')) {
        // Provide more specific error message for authentication failures
        if (response.includes('5.7.8') || response.includes('BadCredentials')) {
          throw new Error(`Credenciais inválidas. Verifique o email e senha/App Password. Para Gmail, use App Password em vez da senha normal.`);
        }
        throw new Error(`Autenticação falhou: ${response.trim()}`);
      }

      console.log("✅ Autenticação SMTP bem-sucedida");

      // MAIL FROM
      response = await sendCommand(`MAIL FROM:<${config.email}>`);
      if (!response.startsWith('250')) {
        throw new Error(`MAIL FROM falhou: ${response.trim()}`);
      }

      // RCPT TO
      response = await sendCommand(`RCPT TO:<${recipientEmail}>`);
      if (!response.startsWith('250')) {
        throw new Error(`RCPT TO falhou: ${response.trim()}`);
      }

      // DATA
      response = await sendCommand("DATA");
      if (!response.startsWith('354')) {
        throw new Error(`DATA falhou: ${response.trim()}`);
      }

      // Send email content
      await conn.write(encoder.encode(emailMessage));
      response = await sendCommand(".");
      if (!response.startsWith('250')) {
        throw new Error(`Envio da mensagem falhou: ${response.trim()}`);
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
        from: `"${config.fromName}" <${config.email}>`,
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
 * Save email to history table
 */
async function saveToHistory(
  userId: string,
  emailData: any,
  result: { success: boolean; error?: string },
  templateId?: string,
  contactId?: string
) {
  try {
    const historyRecord = {
      user_id: userId,
      template_id: templateId || null,
      contato_id: contactId || null,
      remetente_nome: emailData.fromName || 'Sistema',
      remetente_email: emailData.fromEmail || emailData.from || 'sistema@app.com',
      destinatario_nome: emailData.contactName || extractNameFromEmail(emailData.to),
      destinatario_email: extractEmailAddress(emailData.to),
      status: result.success ? 'entregue' : 'falhou',
      template_nome: emailData.templateName || null,
      tipo_envio: 'imediato',
      mensagem_erro: result.error || null,
      data_envio: new Date().toISOString()
    };

    const { error } = await supabase
      .from('envios_historico')
      .insert(historyRecord);

    if (error) {
      console.error('Erro ao salvar histórico:', error);
    } else {
      console.log('✅ Histórico salvo com sucesso');
    }
  } catch (error) {
    console.error('Erro ao processar histórico:', error);
  }
}

/**
 * Extract name from email address
 */
function extractNameFromEmail(email: string): string {
  if (!email) return 'Destinatário';
  
  const emailRegex = /^"?([^"]*)"?\s*<([^>]+)>$/;
  const match = email.match(emailRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no name found, use the part before @ as name
  const actualEmail = extractEmailAddress(email);
  return actualEmail.split('@')[0];
}

/**
 * ULTRA-OPTIMIZED batch email processing with history recording
 */
async function processEmailBatchOptimized(
  emailJobs: any[],
  smtpConfig: any,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<any> {
  const config = {
    maxConcurrent: 30, // Increased for maximum speed
    chunkSize: 60, // Larger chunks
    delayBetweenChunks: 300, // Minimal delay
    connectionTimeout: 10000,
    maxRetries: 2
  };

  const startTime = Date.now();
  const results: any[] = [];
  const historyRecords: any[] = [];
  let processed = 0;

  console.log(`🚀 ULTRA-OPTIMIZED: Processando ${emailJobs.length} emails`);
  console.log(`⚡ Config: ${config.maxConcurrent} simultâneos, chunks de ${config.chunkSize}`);

  // Process in ultra-optimized parallel chunks
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`⚡ CHUNK ${chunkNumber}/${totalChunks}: processando ${chunk.length} emails`);

    // Process all emails in chunk simultaneously with Promise.all()
    const chunkPromises = chunk.map(async (emailData, emailIndex) => {
      const globalIndex = i + emailIndex;
      const jobStartTime = Date.now();
      
      try {
        // Retry logic
        let lastError: Error;
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            console.log(`📤 [${globalIndex + 1}/${emailJobs.length}] Enviando: ${emailData.to}`);
            
            const result = await sendEmailViaSMTP(smtpConfig, emailData);
            const duration = Date.now() - jobStartTime;
            
            processed++;
            onProgress?.(processed, emailJobs.length);
            
            console.log(`✅ [${globalIndex + 1}] SUCESSO em ${duration}ms`);

            // Prepare history record
            const historyRecord = {
              user_id: userId,
              template_id: emailData.template_id || null,
              contato_id: emailData.contato_id || null,
              remetente_nome: emailData.fromName || result.fromName || 'Sistema',
              remetente_email: emailData.fromEmail || result.from || extractEmailAddress(result.from || ''),
              destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
              destinatario_email: extractEmailAddress(emailData.to),
              status: 'entregue',
              template_nome: emailData.template_nome || null,
              tipo_envio: 'imediato',
              mensagem_erro: null,
              data_envio: new Date().toISOString()
            };
            historyRecords.push(historyRecord);
            
            return {
              success: true,
              result: result,
              to: emailData.to,
              index: globalIndex,
              duration,
              provider: 'smtp',
              attempts: attempt + 1
            };
          } catch (error: any) {
            lastError = error;
            
            if (attempt < config.maxRetries) {
              const delay = Math.min(500 * Math.pow(2, attempt), 2000);
              console.log(`⚠️ [${globalIndex + 1}] Retry ${attempt + 1}/${config.maxRetries} em ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`❌ [${globalIndex + 1}] FALHA FINAL: ${error.message}`);
            }
          }
        }
        
        // If we get here, all retries failed
        const duration = Date.now() - jobStartTime;
        processed++;
        onProgress?.(processed, emailJobs.length);

        // Prepare failure history record
        const historyRecord = {
          user_id: userId,
          template_id: emailData.template_id || null,
          contato_id: emailData.contato_id || null,
          remetente_nome: emailData.fromName || 'Sistema',
          remetente_email: emailData.fromEmail || 'sistema@app.com',
          destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
          destinatario_email: extractEmailAddress(emailData.to),
          status: 'falhou',
          template_nome: emailData.template_nome || null,
          tipo_envio: 'imediato',
          mensagem_erro: lastError.message,
          data_envio: new Date().toISOString()
        };
        historyRecords.push(historyRecord);
        
        return {
          success: false,
          error: lastError.message,
          to: emailData.to,
          index: globalIndex,
          duration,
          provider: 'smtp',
          attempts: config.maxRetries + 1
        };
      } catch (error: any) {
        // Fallback error handling
        const duration = Date.now() - jobStartTime;
        processed++;
        onProgress?.(processed, emailJobs.length);

        // Prepare failure history record
        const historyRecord = {
          user_id: userId,
          template_id: emailData.template_id || null,
          contato_id: emailData.contato_id || null,
          remetente_nome: emailData.fromName || 'Sistema',
          remetente_email: emailData.fromEmail || 'sistema@app.com',
          destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
          destinatario_email: extractEmailAddress(emailData.to),
          status: 'falhou',
          template_nome: emailData.template_nome || null,
          tipo_envio: 'imediato',
          mensagem_erro: error.message,
          data_envio: new Date().toISOString()
        };
        historyRecords.push(historyRecord);
        
        return {
          success: false,
          error: error.message,
          to: emailData.to,
          index: globalIndex,
          duration,
          provider: 'smtp',
          attempts: 1
        };
      }
    });

    // Wait for all emails in chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Minimal delay between chunks
    if (i + config.chunkSize < emailJobs.length) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
    }
  }

  // Save all history records in batch
  if (historyRecords.length > 0) {
    try {
      console.log(`💾 Salvando ${historyRecords.length} registros no histórico...`);
      const { error } = await supabase
        .from('envios_historico')
        .insert(historyRecords);

      if (error) {
        console.error('Erro ao salvar histórico em lote:', error);
      } else {
        console.log('✅ Histórico salvo em lote com sucesso');
      }
    } catch (error) {
      console.error('Erro ao processar histórico em lote:', error);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`📊 ULTRA-OPTIMIZED COMPLETO em ${Math.round(totalDuration / 1000)}s`);
  console.log(`⚡ Taxa média: ${avgThroughput.toFixed(2)} emails/segundo`);
  console.log(`✅ Sucessos: ${successful}/${emailJobs.length} (${((successful/emailJobs.length)*100).toFixed(1)}%)`);
  console.log(`⏱️ Duração média por email: ${Math.round(avgDuration)}ms`);

  return {
    results,
    summary: {
      total: emailJobs.length,
      successful,
      failed: emailJobs.length - successful,
      smtp: successful,
      resend: 0,
      fallback: 0,
      successRate: emailJobs.length > 0 ? ((successful / emailJobs.length) * 100).toFixed(1) : "0",
      avgThroughput: Math.round(avgThroughput * 100) / 100,
      totalDuration: Math.round(totalDuration / 1000),
      avgEmailDuration: Math.round(avgDuration)
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

    // Get user ID for history recording
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!error && user) {
          userId = user.id;
        }
      } catch (e) {
        console.error('Error getting user:', e);
      }
    }
    
    // Handle optimized batch email sending
    if (requestData.batch && Array.isArray(requestData.emails)) {
      console.log(`📬 Solicitação de envio ULTRA-OTIMIZADO para ${requestData.emails.length} destinatários`);
      console.log(`🔧 SMTP ativado: ${requestData.use_smtp}`);
      
      if (!requestData.use_smtp || !requestData.smtp_settings) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP deve estar configurado para envio em lote otimizado"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      // Prepare optimized SMTP configuration
      const smtpConfig = {
        host: requestData.smtp_settings.host,
        port: requestData.smtp_settings.port,
        email_usuario: requestData.smtp_settings.from_email,
        password: requestData.smtp_settings.password,
        from_email: requestData.smtp_settings.from_email,
        from_name: requestData.smtp_settings.from_name || 'RocketMail',
        smtp_nome: requestData.smtp_settings.from_name
      };
      
      // Build optimized email requests
      const emailRequests = [];
      
      for (const emailData of requestData.emails) {
        try {
          let templateContent = emailData.content || '';
          let templateSubject = emailData.subject || 'Sem assunto';
          
          if (emailData.template_id) {
            const { data: templateData, error: templateError } = await supabase
              .from('templates')
              .select('*')
              .eq('id', emailData.template_id)
              .single();
              
            if (!templateError && templateData) {
              templateContent = templateData.conteudo || '';
              templateSubject = emailData.subject || templateData.descricao || templateData.nome || 'Sem assunto';
            }
          }
          
          // Process template variables
          let processedContent = templateContent;
          if (emailData.contact) {
            processedContent = processTemplateVariables(templateContent, emailData.contact);
          }
          
          // Build optimized email HTML
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
          
          // Format recipient email
          let toAddress = emailData.to;
          if (emailData.contato_nome && !toAddress.includes('<')) {
            toAddress = `"${emailData.contato_nome}" <${emailData.to}>`;
          }
          
          emailRequests.push({
            to: toAddress,
            subject: sanitizeSubject(templateSubject),
            html: finalContent,
            attachments: emailData.attachments || [],
            template_id: emailData.template_id,
            contato_id: emailData.contato_id,
            contato_nome: emailData.contato_nome,
            template_nome: emailData.template_nome,
            fromName: smtpConfig.from_name,
            fromEmail: smtpConfig.from_email
          });
          
        } catch (error) {
          console.error(`Erro ao processar email para ${emailData.to}:`, error);
        }
      }
      
      console.log(`📨 Emails preparados para ULTRA-OTIMIZAÇÃO: ${emailRequests.length}`);
      
      try {
        const batchResult = await processEmailBatchOptimized(
          emailRequests, 
          smtpConfig, 
          userId || 'system'
        );
        
        console.log("📊 Envio ULTRA-OTIMIZADO concluído:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Envio em lote ULTRA-OTIMIZADO concluído",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || 'smtp',
              duration: r.duration || 0,
              attempts: r.attempts || 1
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("❌ Falha no processamento ULTRA-OTIMIZADO:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || "Falha no processamento em lote ultra-otimizado"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }
    
    // Handle single email sending (with history recording)
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
    let templateName = null;
    
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
        templateName = templateData.nome;
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
        
        let result;
        let success = false;
        let errorMessage = null;

        try {
          result = await sendEmailViaSMTP(smtpConfig, emailPayload);
          success = true;
          console.log("✅ Email único enviado com sucesso via SMTP:", result);
        } catch (error) {
          errorMessage = error.message;
          console.error("❌ Falha ao enviar email único:", error);
        }

        // Save to history regardless of success/failure
        if (userId) {
          await saveToHistory(
            userId,
            {
              fromName: smtp_settings.from_name || 'Sistema',
              fromEmail: smtp_settings.from_email,
              to: toAddress,
              contactName: contato_nome,
              templateName: templateName
            },
            { success, error: errorMessage },
            template_id,
            contact?.id
          );
        }

        if (success) {
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
              error: errorMessage || "Erro ao enviar email"
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
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
      
      // Save failed attempt to history
      if (userId) {
        await saveToHistory(
          userId,
          {
            fromName: smtp_settings?.from_name || 'Sistema',
            fromEmail: smtp_settings?.from_email || 'sistema@app.com',
            to: toAddress,
            contactName: contato_nome,
            templateName: templateName
          },
          { success: false, error: error.message },
          template_id,
          contact?.id
        );
      }
      
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
