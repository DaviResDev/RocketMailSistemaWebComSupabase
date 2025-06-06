
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { sendEmailViaSMTP, sendEmailViaResend, sendEmail } from '../lib/email-sender.js';
import { processEmailBatchOptimized } from './batch-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailJob {
  to: string;
  contato_id: string;
  template_id: string;
  contato_nome: string;
  subject?: string;
  content?: string;
  template_nome?: string;
  contact?: any;
  image_url?: string;
  signature_image?: string;
  attachments?: any[];
  index: number;
}

interface BatchResult {
  success: boolean;
  index: number;
  to: string;
  error?: string;
  duration: number;
  provider: string;
}

// Configuração Gmail-otimizada para 100% de sucesso
const GMAIL_OPTIMIZED_CONFIG = {
  maxConcurrent: 25, // Reduzido de 500 para respeitear limites do Gmail
  chunkSize: 50,     // Chunks menores para melhor controle
  delayBetweenChunks: 2500, // Pausa entre chunks para rate limiting
  emailsPerSecond: 14, // Limite seguro do Gmail
  burstLimit: 100,    // Limite de rajada
  retryAttempts: 3,   // Tentativas para erros temporários
  gmailErrorRetryDelay: 5000 // Delay específico para erros 421-4.3.0
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('📧 Recebida requisição de envio:', {
      batch: body.batch,
      total_emails: body.batch ? body.emails?.length : 1,
      use_smtp: body.use_smtp,
      gmail_optimized: body.gmail_optimized
    });

    // Validação e sanitização de anexos melhorada
    function validateAndSanitizeAttachments(attachments: any): any[] {
      if (!attachments) return [];
      
      try {
        let parsed = attachments;
        
        // Se é string, tenta fazer parse
        if (typeof attachments === 'string') {
          try {
            parsed = JSON.parse(attachments);
          } catch (e) {
            console.warn('⚠️ Erro ao fazer parse de anexos string:', e);
            return [];
          }
        }
        
        // Converte para array se necessário
        if (!Array.isArray(parsed)) {
          parsed = parsed && typeof parsed === 'object' && 'name' in parsed && 'url' in parsed 
            ? [parsed] 
            : [];
        }
        
        // Valida cada anexo individualmente
        const validAttachments = parsed.filter((attachment: any) => {
          const isValid = attachment && 
                         typeof attachment === 'object' &&
                         attachment.name && 
                         attachment.url &&
                         typeof attachment.name === 'string' &&
                         typeof attachment.url === 'string';
          
          if (!isValid) {
            console.warn('⚠️ Anexo inválido removido:', attachment);
          }
          
          return isValid;
        });
        
        console.log(`✅ Anexos validados: ${validAttachments.length}/${parsed.length}`);
        return validAttachments;
        
      } catch (error) {
        console.error('❌ Erro na validação de anexos:', error);
        return [];
      }
    }

    // Função de envio com retry Gmail-específico
    async function sendEmailWithGmailRetry(emailJob: EmailJob, smtpConfig: any): Promise<BatchResult> {
      const startTime = Date.now();
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= GMAIL_OPTIMIZED_CONFIG.retryAttempts; attempt++) {
        try {
          // Rate limiting inteligente
          if (attempt > 1) {
            const isGmailTempError = lastError?.message?.includes('421-4.3.0') || 
                                   lastError?.message?.includes('Temporary System Problem');
            
            const delay = isGmailTempError ? 
              GMAIL_OPTIMIZED_CONFIG.gmailErrorRetryDelay : 
              1000 * Math.pow(2, attempt - 1);
            
            console.log(`⏳ Gmail retry ${attempt}/${GMAIL_OPTIMIZED_CONFIG.retryAttempts} após ${delay}ms para ${emailJob.to}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Prepara payload com anexos validados
          const emailPayload = {
            to: emailJob.to,
            subject: emailJob.subject || 'Email sem assunto',
            html: emailJob.content || '',
            attachments: validateAndSanitizeAttachments(emailJob.attachments),
            contato_nome: emailJob.contato_nome,
            template_nome: emailJob.template_nome,
            image_url: emailJob.image_url,
            signature_image: emailJob.signature_image
          };
          
          console.log(`📤 Tentativa ${attempt}: Enviando para ${emailJob.to} (${emailPayload.attachments.length} anexos)`);
          
          // Usa função SMTP diretamente para melhor controle
          await sendEmailViaSMTP(smtpConfig, emailPayload);
          
          const duration = Date.now() - startTime;
          console.log(`✅ Sucesso para ${emailJob.to} em ${duration}ms (tentativa ${attempt})`);
          
          return {
            success: true,
            index: emailJob.index,
            to: emailJob.to,
            duration,
            provider: 'gmail_optimized_v4'
          };
          
        } catch (error: any) {
          lastError = error;
          const isGmailTempError = error.message?.includes('421-4.3.0') || 
                                 error.message?.includes('Temporary System Problem');
          
          console.error(`❌ Tentativa ${attempt} falhou para ${emailJob.to}:`, {
            error: error.message,
            isGmailTempError,
            willRetry: attempt < GMAIL_OPTIMIZED_CONFIG.retryAttempts
          });
          
          // Se não é erro temporário do Gmail e já tentou uma vez, para
          if (!isGmailTempError && attempt > 1) {
            break;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      return {
        success: false,
        index: emailJob.index,
        to: emailJob.to,
        error: lastError?.message || 'Erro desconhecido',
        duration,
        provider: 'gmail_optimized_v4'
      };
    }

    // Processamento em lote otimizado para Gmail
    if (body.batch && body.emails && Array.isArray(body.emails)) {
      const emailJobs: EmailJob[] = body.emails.map((email: any, index: number) => ({
        ...email,
        index,
        attachments: validateAndSanitizeAttachments(email.attachments)
      }));

      console.log(`🚀 INICIANDO ENVIO GMAIL-OTIMIZADO: ${emailJobs.length} emails`);
      console.log(`⚙️ Configuração: ${GMAIL_OPTIMIZED_CONFIG.maxConcurrent} concurrent, ${GMAIL_OPTIMIZED_CONFIG.emailsPerSecond} emails/s`);

      // Configuração SMTP validada
      const smtpConfig = body.smtp_settings && body.use_smtp ? {
        host: body.smtp_settings.host,
        port: body.smtp_settings.port || 587,
        secure: body.smtp_settings.secure || body.smtp_settings.port === 465,
        auth: {
          user: body.smtp_settings.from_email,
          pass: body.smtp_settings.password
        },
        from_name: body.smtp_settings.from_name || '',
        from_email: body.smtp_settings.from_email || ''
      } : null;

      if (!smtpConfig) {
        throw new Error('Configuração SMTP obrigatória para envio em lote otimizado');
      }

      console.log(`✅ SMTP configurado: ${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.secure ? 'SSL' : 'TLS'})`);

      // Processamento com rate limiting Gmail
      const results: BatchResult[] = [];
      const startTime = Date.now();
      let processed = 0;
      
      // Controle de rate limiting
      let emailsSentInCurrentSecond = 0;
      let lastSecondReset = Date.now();
      
      // Processa em chunks com rate limiting
      for (let i = 0; i < emailJobs.length; i += GMAIL_OPTIMIZED_CONFIG.chunkSize) {
        const chunk = emailJobs.slice(i, i + GMAIL_OPTIMIZED_CONFIG.chunkSize);
        const chunkNumber = Math.floor(i / GMAIL_OPTIMIZED_CONFIG.chunkSize) + 1;
        const totalChunks = Math.ceil(emailJobs.length / GMAIL_OPTIMIZED_CONFIG.chunkSize);
        
        console.log(`📦 Processando chunk ${chunkNumber}/${totalChunks} (${chunk.length} emails)`);
        
        // Semáforo para controlar concorrência
        let activeConnections = 0;
        const maxConcurrent = GMAIL_OPTIMIZED_CONFIG.maxConcurrent;
        
        const chunkPromises = chunk.map(async (emailJob) => {
          // Espera vaga disponível
          while (activeConnections >= maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          activeConnections++;
          
          try {
            // Rate limiting: verifica se precisa aguardar
            const now = Date.now();
            if (now - lastSecondReset >= 1000) {
              emailsSentInCurrentSecond = 0;
              lastSecondReset = now;
            }
            
            if (emailsSentInCurrentSecond >= GMAIL_OPTIMIZED_CONFIG.emailsPerSecond) {
              const waitTime = 1000 - (now - lastSecondReset);
              if (waitTime > 0) {
                console.log(`🚦 Rate limit: aguardando ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                emailsSentInCurrentSecond = 0;
                lastSecondReset = Date.now();
              }
            }
            
            emailsSentInCurrentSecond++;
            
            const result = await sendEmailWithGmailRetry(emailJob, smtpConfig);
            processed++;
            
            if (result.success) {
              console.log(`✅ [${processed}/${emailJobs.length}] Sucesso: ${result.to}`);
            } else {
              console.error(`❌ [${processed}/${emailJobs.length}] Falha: ${result.to} - ${result.error}`);
            }
            
            return result;
            
          } finally {
            activeConnections--;
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        console.log(`✅ Chunk ${chunkNumber} concluído: ${chunkResults.filter(r => r.success).length}/${chunkResults.length} sucessos`);
        
        // Pausa entre chunks para rate limiting
        if (i + GMAIL_OPTIMIZED_CONFIG.chunkSize < emailJobs.length) {
          console.log(`⏸️ Pausa de ${GMAIL_OPTIMIZED_CONFIG.delayBetweenChunks}ms entre chunks...`);
          await new Promise(resolve => setTimeout(resolve, GMAIL_OPTIMIZED_CONFIG.delayBetweenChunks));
        }
      }

      const totalDuration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const successRate = ((successful / emailJobs.length) * 100).toFixed(1);
      const avgThroughput = (emailJobs.length / totalDuration) * 1000;

      console.log(`🎯 RESULTADO FINAL Gmail-Otimizado:`);
      console.log(`✅ Sucessos: ${successful}/${emailJobs.length} (${successRate}%)`);
      console.log(`❌ Falhas: ${failed}`);
      console.log(`⚡ Throughput: ${avgThroughput.toFixed(2)} emails/s`);
      console.log(`⏱️ Duração: ${Math.round(totalDuration / 1000)}s`);

      // Salva histórico em lote otimizado
      try {
        const historicoRecords = results.map(result => ({
          user_id: body.user_id,
          template_id: emailJobs[result.index].template_id,
          contato_id: emailJobs[result.index].contato_id,
          data_envio: new Date().toISOString(),
          status: result.success ? 'enviado' : 'falha',
          template_nome: emailJobs[result.index].template_nome || 'Template Gmail-Otimizado',
          tipo_envio: 'gmail_optimized_v4',
          mensagem_erro: result.error || null,
          remetente_nome: smtpConfig.from_name,
          remetente_email: smtpConfig.from_email,
          destinatario_nome: emailJobs[result.index].contato_nome,
          destinatario_email: result.to
        }));

        const { error: historicoError } = await supabase
          .from('envios_historico')
          .insert(historicoRecords);

        if (historicoError) {
          console.error('❌ Erro ao salvar histórico:', historicoError);
        } else {
          console.log(`💾 Histórico salvo: ${historicoRecords.length} registros`);
        }
      } catch (error) {
        console.error('❌ Erro no processamento do histórico:', error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            total: emailJobs.length,
            successful,
            failed,
            successRate,
            avgThroughput: Math.round(avgThroughput * 100) / 100,
            totalDuration: Math.round(totalDuration / 1000),
            avgEmailDuration: successful > 0 ? Math.round(results.filter(r => r.success).reduce((acc, r) => acc + r.duration, 0) / successful) : 0,
            gmailOptimized: true
          },
          results,
          provider: 'gmail_optimized_v4'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Envio individual (sem alterações na lógica existente)
    const useSmtp = body.use_smtp || false;
    const smtpConfig = body.smtp_settings;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromName = body.from_name || 'Sistema';

    console.log('📤 Enviando email individual:', {
      to: body.to,
      useSmtp,
      hasSmtpConfig: !!smtpConfig,
      hasResendKey: !!resendApiKey
    });

    // Valida anexos para envio individual
    const validatedAttachments = validateAndSanitizeAttachments(body.attachments);
    const emailPayload = {
      ...body,
      attachments: validatedAttachments
    };

    console.log(`📎 Anexos para envio individual: ${validatedAttachments.length}`);

    const result = await sendEmail(emailPayload, useSmtp, smtpConfig, resendApiKey, fromName);

    // Salva no histórico individual
    if (body.contato_id && body.template_id && body.user_id) {
      try {
        const { error: historicoError } = await supabase
          .from('envios_historico')
          .insert({
            user_id: body.user_id,
            template_id: body.template_id,
            contato_id: body.contato_id,
            data_envio: new Date().toISOString(),
            status: 'enviado',
            template_nome: body.template_nome || 'Email Individual',
            tipo_envio: 'individual',
            remetente_nome: fromName,
            remetente_email: useSmtp ? smtpConfig?.from_email : 'sistema@resend.dev',
            destinatario_nome: body.contato_nome || 'Destinatário',
            destinatario_email: body.to
          });

        if (historicoError) {
          console.error('❌ Erro ao salvar histórico individual:', historicoError);
        }
      } catch (error) {
        console.error('❌ Erro no processamento do histórico individual:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email enviado com sucesso',
        result,
        attachments_processed: validatedAttachments.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Erro geral na função send-email:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
