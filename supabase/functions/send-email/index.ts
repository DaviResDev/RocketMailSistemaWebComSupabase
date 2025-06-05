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
 * ULTRA-OPTIMIZED batch email processing V3.0 with history recording
 * Target: 100+ emails/second with 500 concurrent connections
 */
async function processEmailBatchUltraOptimized(
  emailJobs: any[],
  smtpConfig: any,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<any> {
  const config = {
    maxConcurrent: 500, // 500 simultaneous connections
    chunkSize: 1000, // Process 1000 emails per chunk
    delayBetweenChunks: 50, // Minimal 50ms delay
    connectionTimeout: 8000, // 8 second timeout
    maxRetries: 2, // 2 retry attempts
    progressUpdateInterval: 500 // 500ms progress updates
  };

  const startTime = Date.now();
  const results: any[] = [];
  const historyRecords: any[] = [];
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  let peakThroughput = 0;
  let progressHistory: Array<{time: number, count: number}> = [];

  console.log(`🚀 ULTRA-OPTIMIZED V3.0: Processando ${emailJobs.length} emails`);
  console.log(`🎯 Meta: 100+ emails/s com ${config.maxConcurrent} conexões simultâneas`);
  console.log(`📦 Chunks de ${config.chunkSize} emails com delay de ${config.delayBetweenChunks}ms`);

  // Calculate real-time throughput
  const calculateThroughput = () => {
    const now = Date.now();
    progressHistory.push({ time: now, count: processed });
    progressHistory = progressHistory.filter(p => now - p.time <= 5000); // Keep 5s history

    if (progressHistory.length >= 2) {
      const recent = progressHistory[progressHistory.length - 1];
      const older = progressHistory[0];
      const timeDiff = recent.time - older.time;
      const countDiff = recent.count - older.count;
      return timeDiff > 0 ? (countDiff / timeDiff) * 1000 : 0;
    }
    return 0;
  };

  // Process in ultra-optimized parallel chunks
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`📦 CHUNK ${chunkNumber}/${totalChunks}: ${chunk.length} emails com ${config.maxConcurrent} conexões`);

    // Create semaphore for controlled concurrency (500 connections)
    const semaphore = new Array(config.maxConcurrent).fill(null);
    let semaphoreIndex = 0;

    // Process all emails in chunk with 500 concurrent connections
    const chunkPromises = chunk.map(async (emailData, emailIndex) => {
      const globalIndex = i + emailIndex;
      const connectionSlot = semaphoreIndex % config.maxConcurrent;
      semaphoreIndex++;
      
      const jobStartTime = Date.now();
      
      try {
        // Retry logic with exponential backoff
        let lastError: Error;
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            console.log(`📤 [${globalIndex + 1}/${emailJobs.length}] Slot ${connectionSlot}: ${emailData.to}`);
            
            const result = await sendEmailViaSMTP(smtpConfig, emailData);
            const duration = Date.now() - jobStartTime;
            
            processed++;
            successCount++;
            onProgress?.(processed, emailJobs.length);
            
            // Calculate current throughput
            const currentThroughput = calculateThroughput();
            if (currentThroughput > peakThroughput) {
              peakThroughput = currentThroughput;
            }
            
            console.log(`✅ [${globalIndex + 1}] SUCESSO em ${duration}ms (Throughput: ${currentThroughput.toFixed(2)} emails/s)`);

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
              tipo_envio: 'lote_ultra_v3',
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
              attempts: attempt + 1,
              connectionSlot
            };
          } catch (error: any) {
            lastError = error;
            
            if (attempt < config.maxRetries) {
              const delay = Math.min(100 * Math.pow(2, attempt), 1000); // Max 1s delay
              console.log(`⚠️ [${globalIndex + 1}] Retry ${attempt + 1}/${config.maxRetries} em ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`❌ [${globalIndex + 1}] FALHA FINAL após ${config.maxRetries + 1} tentativas: ${error.message}`);
            }
          }
        }
        
        // If we get here, all retries failed
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        onProgress?.(processed, emailJobs.length);

        // Calculate current throughput
        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

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
          tipo_envio: 'lote_ultra_v3',
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
          attempts: config.maxRetries + 1,
          connectionSlot
        };
      } catch (error: any) {
        // Fallback error handling
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        onProgress?.(processed, emailJobs.length);

        // Calculate current throughput
        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

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
          tipo_envio: 'lote_ultra_v3',
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
          attempts: 1,
          connectionSlot
        };
      }
    });

    // Wait for all emails in chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Log chunk completion with performance metrics
    const chunkThroughput = calculateThroughput();
    console.log(`✅ CHUNK ${chunkNumber} CONCLUÍDO: ${chunkResults.filter(r => r.success).length}/${chunk.length} sucessos (Throughput atual: ${chunkThroughput.toFixed(2)} emails/s)`);

    // Minimal delay between chunks
    if (i + config.chunkSize < emailJobs.length) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
    }
  }

  // Save all history records in batch
  if (historyRecords.length > 0) {
    try {
      console.log(`💾 Salvando ${historyRecords.length} registros no histórico ultra-otimizado...`);
      const { error } = await supabase
        .from('envios_historico')
        .insert(historyRecords);

      if (error) {
        console.error('Erro ao salvar histórico em lote ultra-otimizado:', error);
      } else {
        console.log('✅ Histórico ultra-otimizado salvo em lote com sucesso');
      }
    } catch (error) {
      console.error('Erro ao processar histórico em lote ultra-otimizado:', error);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`📊 ULTRA-OPTIMIZED V3.0 COMPLETO em ${Math.round(totalDuration / 1000)}s`);
  console.log(`🎯 Taxa média final: ${avgThroughput.toFixed(2)} emails/segundo`);
  console.log(`🏆 Pico de performance: ${peakThroughput.toFixed(2)} emails/segundo`);
  console.log(`✅ Sucessos: ${successful}/${emailJobs.length} (${((successful/emailJobs.length)*100).toFixed(1)}%)`);
  console.log(`⏱️ Duração média por email: ${Math.round(avgDuration)}ms`);
  console.log(`🚀 Meta de 100+ emails/s ${avgThroughput >= 100 || peakThroughput >= 100 ? 'ALCANÇADA!' : 'em progresso'}`);

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
      peakThroughput: Math.round(peakThroughput * 100) / 100,
      totalDuration: Math.round(totalDuration / 1000),
      avgEmailDuration: Math.round(avgDuration),
      targetAchieved: avgThroughput >= 100 || peakThroughput >= 100
    }
  };
}

/**
 * ULTRA-PARALLEL V5.0 - 200+ emails/segundo com 1000 conexões simultâneas
 */
async function processUltraParallelV5(
  emailJobs: any[],
  smtpConfig: any,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<any> {
  const config = {
    maxConcurrent: 1000, // 1000 conexões simultâneas
    chunkSize: 200, // Chunks de 200 conforme solicitado
    delayBetweenChunks: 0, // Zero delay para velocidade máxima
    connectionTimeout: 3000, // 3s timeout ultra-agressivo
    maxRetries: 1, // Apenas 1 retry para velocidade
    targetThroughput: 200, // Meta de 200 emails/s
    batchHistorySize: 500 // Histórico em lotes de 500
  };

  const startTime = Date.now();
  const results: any[] = [];
  const historyRecords: any[] = [];
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  let peakThroughput = 0;
  let progressHistory: Array<{time: number, count: number}> = [];

  console.log(`🚀 ULTRA-PARALLEL V5.0: ${emailJobs.length} emails com META 200+ emails/s`);
  console.log(`⚡ Configuração ultra-agressiva: ${config.maxConcurrent} conexões, chunks ${config.chunkSize}, zero delay`);

  // Função para calcular throughput em tempo real
  const calculateThroughput = () => {
    const now = Date.now();
    progressHistory.push({ time: now, count: processed });
    progressHistory = progressHistory.filter(p => now - p.time <= 2000); // 2s de histórico

    if (progressHistory.length >= 2) {
      const recent = progressHistory[progressHistory.length - 1];
      const older = progressHistory[0];
      const timeDiff = recent.time - older.time;
      const countDiff = recent.count - older.count;
      return timeDiff > 0 ? (countDiff / timeDiff) * 1000 : 0;
    }
    return 0;
  };

  // Processamento em chunks ultra-paralelos
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`⚡ ULTRA-CHUNK ${chunkNumber}/${totalChunks}: ${chunk.length} emails, ${config.maxConcurrent} slots`);

    // 1000 conexões simultâneas por chunk
    const chunkPromises = chunk.map(async (emailData, emailIndex) => {
      const globalIndex = i + emailIndex;
      const connectionSlot = globalIndex % config.maxConcurrent;
      
      const jobStartTime = Date.now();
      
      try {
        // Envio com retry ultra-mínimo
        let lastError: Error;
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            const result = await sendEmailViaSMTP(smtpConfig, emailData);
            const duration = Date.now() - jobStartTime;
            
            processed++;
            successCount++;
            onProgress?.(processed, emailJobs.length);
            
            const currentThroughput = calculateThroughput();
            if (currentThroughput > peakThroughput) {
              peakThroughput = currentThroughput;
            }
            
            // Log apenas a cada 50 emails para performance
            if (globalIndex % 50 === 0) {
              console.log(`🚀 [${globalIndex + 1}] ULTRA-SUCESSO: ${currentThroughput.toFixed(2)} emails/s`);
            }

            // Registro para histórico em lote
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
              tipo_envio: 'ultra_parallel_v5',
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
              provider: 'ultra_parallel_v5',
              connectionSlot,
              attempt: attempt + 1
            };
          } catch (error: any) {
            lastError = error;
            
            if (attempt < config.maxRetries) {
              // Delay ultra-mínimo para retry (25ms)
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }
        }
        
        // Falha após retry
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        onProgress?.(processed, emailJobs.length);

        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

        // Registro de falha para histórico
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
          tipo_envio: 'ultra_parallel_v5',
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
          provider: 'ultra_parallel_v5',
          connectionSlot,
          attempt: config.maxRetries + 1
        };
      } catch (error: any) {
        // Fallback de erro
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        onProgress?.(processed, emailJobs.length);

        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

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
          tipo_envio: 'ultra_parallel_v5',
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
          provider: 'ultra_parallel_v5',
          connectionSlot: 0,
          attempt: 1
        };
      }
    });

    // Aguarda TODAS as conexões do chunk simultaneamente
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Log de performance do chunk
    const chunkThroughput = calculateThroughput();
    const chunkSuccessful = chunkResults.filter(r => r.success).length;
    console.log(`🏆 ULTRA-CHUNK ${chunkNumber} FINALIZADO: ${chunkSuccessful}/${chunk.length} sucessos`);
    console.log(`⚡ Throughput atual: ${chunkThroughput.toFixed(2)} emails/s (Pico: ${peakThroughput.toFixed(2)})`);

    // ZERO DELAY - máxima velocidade entre chunks
  }

  // Salva histórico em lotes ultra-otimizados
  if (historyRecords.length > 0) {
    try {
      console.log(`💾 Salvando ${historyRecords.length} registros ultra-paralelos em lotes...`);
      
      const batchSize = config.batchHistorySize;
      for (let i = 0; i < historyRecords.length; i += batchSize) {
        const batch = historyRecords.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('envios_historico')
          .insert(batch);

        if (error) {
          console.error(`Erro no lote ultra ${Math.floor(i/batchSize) + 1}:`, error);
        } else {
          console.log(`✅ Lote ultra ${Math.floor(i/batchSize) + 1} salvo (${batch.length} registros)`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar histórico ultra-paralelo:', error);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const targetAchieved = avgThroughput >= config.targetThroughput || peakThroughput >= config.targetThroughput;

  console.log(`🏆 ULTRA-PARALLEL V5.0 FINALIZADO em ${Math.round(totalDuration / 1000)}s`);
  console.log(`🚀 Taxa média final: ${avgThroughput.toFixed(2)} emails/segundo`);
  console.log(`⚡ Pico absoluto: ${peakThroughput.toFixed(2)} emails/segundo`);
  console.log(`✅ Sucessos: ${successful}/${emailJobs.length} (${((successful/emailJobs.length)*100).toFixed(1)}%)`);
  console.log(`🎯 Meta 200+ emails/s: ${targetAchieved ? '🏆 CONQUISTADA!' : '📈 em andamento'}`);

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
      peakThroughput: Math.round(peakThroughput * 100) / 100,
      totalDuration: Math.round(totalDuration / 1000),
      avgEmailDuration: Math.round(avgDuration),
      targetAchieved
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
    
    // Handle ULTRA-PARALLEL V5.0 batch email sending
    if (requestData.batch && requestData.ultra_parallel_v5 && Array.isArray(requestData.emails)) {
      console.log(`🚀 Solicitação ULTRA-PARALLEL V5.0 para ${requestData.emails.length} destinatários`);
      console.log(`🎯 META: ${requestData.target_throughput || 200}+ emails/s com ${requestData.max_concurrent || 1000} conexões`);
      console.log(`⚡ Chunks de ${requestData.chunk_size || 200} emails com delay zero`);
      
      if (!requestData.use_smtp || !requestData.smtp_settings) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP deve estar configurado para envio ultra-paralelo V5.0"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      // Configuração SMTP ultra-agressiva
      const smtpConfig = {
        host: requestData.smtp_settings.host,
        port: requestData.smtp_settings.port,
        email_usuario: requestData.smtp_settings.from_email,
        password: requestData.smtp_settings.password,
        from_email: requestData.smtp_settings.from_email,
        from_name: requestData.smtp_settings.from_name || 'RocketMail',
        smtp_nome: requestData.smtp_settings.from_name
      };
      
      // Build ultra-optimized email requests
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
          
          // Build ultra-optimized email HTML
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

      console.log("🚀 Iniciando ULTRA-PARALLEL V5.0:", {
        batch_size: emailRequests.length,
        target_throughput: "200+ emails/s",
        max_concurrent: 1000,
        chunk_size: 200,
        zero_delay: true,
        estimated_duration: Math.ceil(requestData.emails.length / 200) + "s"
      });
      
      try {
        const batchResult = await processUltraParallelV5(
          emailRequests, 
          smtpConfig, 
          userId || 'system'
        );
        
        console.log("🏆 Envio ULTRA-PARALLEL V5.0 concluído:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Envio ULTRA-PARALLEL V5.0 concluído com sucesso",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || 'ultra_parallel_v5',
              duration: r.duration || 0,
              attempts: r.attempts || 1,
              connectionSlot: r.connectionSlot || 0
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("❌ Falha no processamento ULTRA-PARALLEL V5.0:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || "Falha no processamento ultra-paralelo V5.0"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }
    
    // Handle ultra-optimized batch email sending V3.0
    if (requestData.batch && Array.isArray(requestData.emails)) {
      console.log(`📬 Solicitação ULTRA-OTIMIZADA V3.0 para ${requestData.emails.length} destinatários`);
      console.log(`🎯 Meta: ${requestData.target_throughput || 100}+ emails/s com ${requestData.max_concurrent || 500} conexões`);
      console.log(`📦 Processamento em chunks de ${requestData.chunk_size || 1000} emails`);
      
      if (!requestData.use_smtp || !requestData.smtp_settings) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "SMTP deve estar configurado para envio ultra-otimizado V3.0"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      // Prepare ultra-optimized SMTP configuration for 500 connections
      const smtpConfig = {
        host: requestData.smtp_settings.host,
        port: requestData.smtp_settings.port,
        email_usuario: requestData.smtp_settings.from_email,
        password: requestData.smtp_settings.password,
        from_email: requestData.smtp_settings.from_email,
        from_name: requestData.smtp_settings.from_name || 'RocketMail',
        smtp_nome: requestData.smtp_settings.from_name
      };
      
      // Build ultra-optimized email requests
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
          
          // Build ultra-optimized email HTML
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
      
      console.log(`📨 Emails preparados para ULTRA-OTIMIZAÇÃO V3.0: ${emailRequests.length}`);
      
      try {
        const batchResult = await processEmailBatchUltraOptimized(
          emailRequests, 
          smtpConfig, 
          userId || 'system'
        );
        
        console.log("📊 Envio ULTRA-OTIMIZADO V3.0 concluído:", batchResult.summary);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Envio em lote ULTRA-OTIMIZADO V3.0 concluído",
            summary: batchResult.summary,
            results: batchResult.results.map(r => ({
              to: r.to,
              success: r.success,
              error: r.error || null,
              id: r.result?.id || null,
              provider: r.provider || 'smtp',
              duration: r.duration || 0,
              attempts: r.attempts || 1,
              connectionSlot: r.connectionSlot || 0
            }))
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        console.error("❌ Falha no processamento ULTRA-OTIMIZADO V3.0:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || "Falha no processamento em lote ultra-otimizado V3.0"
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
    console.error("❌ Erro não tratado na função send-email ultra-otimizada:", error);
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
