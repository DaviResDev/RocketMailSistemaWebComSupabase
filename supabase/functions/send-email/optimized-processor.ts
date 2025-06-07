

// Processador otimizado para envio em lote com SMTP real do usuário
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import nodemailer from 'npm:nodemailer';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função de delay local
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Envio real via SMTP do usuário
async function enviarEmailSMTP(email: any, smtp: any): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransporter({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.username || smtp.from_email,
        pass: smtp.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log(`📧 Enviando email real via SMTP para ${email.to}`);
    
    const info = await transporter.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to: email.to,
      subject: email.subject,
      html: email.content || email.html,
      attachments: email.attachments || []
    });

    console.log(`✅ Email enviado com sucesso para ${email.to}:`, info.messageId);
    return info.accepted && info.accepted.length > 0;
  } catch (error: any) {
    console.error(`❌ Erro ao enviar email via SMTP para ${email.to}:`, error);
    return false;
  }
}

// Substitui a simulação por envio real
async function simulateEmailSend(email: any): Promise<boolean> {
  return await enviarEmailSMTP(email, email.smtp_settings);
}

// Novo: Processamento de envio único
export async function processSingleSend(email: any, smtp_settings: any): Promise<any> {
  try {
    console.log(`📧 Processando envio único para ${email.to}`);
    
    const emailWithSmtp = {
      ...email,
      smtp_settings: smtp_settings
    };
    
    const success = await enviarEmailSMTP(emailWithSmtp, smtp_settings);

    if (success) {
      await registerInHistory(emailWithSmtp, 'enviado', null);
      return { 
        success: true,
        message: `Email enviado com sucesso para ${email.to}`
      };
    } else {
      await registerInHistory(emailWithSmtp, 'erro', 'Falha no envio SMTP');
      return { 
        success: false, 
        error: 'Falha no envio SMTP' 
      };
    }
  } catch (err: any) {
    console.error('Erro no envio único:', err);
    await registerInHistory(email, 'erro', err.message);
    return { 
      success: false, 
      error: err.message 
    };
  }
}

export async function processOptimizedBatch(data: any): Promise<any> {
  const { emails, smtp_settings, optimization_config } = data;
  
  if (!emails || emails.length === 0) {
    return {
      success: false,
      error: "Nenhum email para processar"
    };
  }

  if (!smtp_settings || !smtp_settings.host) {
    return {
      success: false,
      error: "Configurações SMTP são obrigatórias"
    };
  }

  console.log(`🚀 SISTEMA SMTP REAL iniciado para ${emails.length} emails`);
  console.log(`📧 SMTP: ${smtp_settings.host}:${smtp_settings.port}`);
  
  // Detectar provedor baseado no host SMTP
  const isGmail = smtp_settings.host?.includes('gmail');
  const isOutlook = smtp_settings.host?.includes('outlook') || smtp_settings.host?.includes('live');
  const isYahoo = smtp_settings.host?.includes('yahoo');
  
  // Configurações otimizadas por provedor
  const providerConfigs = {
    gmail: {
      rateLimitPerMinute: 15,
      burstLimit: 5,
      baseDelay: 3000,
      maxConcurrent: 2,
      successRateTarget: "98.0%"
    },
    outlook: {
      rateLimitPerMinute: 20,
      burstLimit: 8,
      baseDelay: 2000,
      maxConcurrent: 3,
      successRateTarget: "97.0%"
    },
    yahoo: {
      rateLimitPerMinute: 18,
      burstLimit: 6,
      baseDelay: 2500,
      maxConcurrent: 2,
      successRateTarget: "96.0%"
    },
    other: {
      rateLimitPerMinute: 25,
      burstLimit: 10,
      baseDelay: 1500,
      maxConcurrent: 5,
      successRateTarget: "95.0%"
    }
  };

  const provider = isGmail ? 'gmail' : isOutlook ? 'outlook' : isYahoo ? 'yahoo' : 'other';
  const config = providerConfigs[provider];
  
  console.log(`⚙️ Configuração ${provider.charAt(0).toUpperCase() + provider.slice(1)}:`, {
    rateLimitPerMinute: config.rateLimitPerMinute,
    burstLimit: config.burstLimit,
    baseDelay: config.baseDelay,
    maxConcurrent: config.maxConcurrent,
    successRateTarget: config.successRateTarget
  });

  const results: any[] = [];
  const startTime = Date.now();
  
  // Processamento em lotes paralelos com SMTP real
  const batchSize = config.maxConcurrent;
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    console.log(`📦 Processando lote ${Math.floor(i / batchSize) + 1} com ${batch.length} emails via SMTP`);
    
    // Processar lote em paralelo usando SMTP real
    const batchPromises = batch.map(async (email: any, index: number) => {
      const emailIndex = i + index;
      try {
        console.log(`📧 [${emailIndex + 1}/${emails.length}] Enviando via SMTP para ${email.to}`);
        
        // Adicionar configurações SMTP ao email
        const emailWithSmtp = {
          ...email,
          smtp_settings: smtp_settings
        };
        
        // Envio real via SMTP
        const success = await enviarEmailSMTP(emailWithSmtp, smtp_settings);
        
        if (success) {
          successCount++;
          console.log(`✅ [${emailIndex + 1}/${emails.length}] SMTP sucesso para ${email.to}`);
          
          // Registrar no histórico
          await registerInHistory(emailWithSmtp, 'enviado', null);
          
          return {
            email: email.to,
            success: true,
            index: emailIndex,
            method: 'SMTP'
          };
        } else {
          failureCount++;
          const error = "Falha no envio SMTP";
          console.log(`❌ [${emailIndex + 1}/${emails.length}] SMTP falha para ${email.to}: ${error}`);
          
          // Registrar no histórico
          await registerInHistory(emailWithSmtp, 'erro', error);
          
          return {
            email: email.to,
            success: false,
            error,
            index: emailIndex,
            method: 'SMTP'
          };
        }
      } catch (error: any) {
        failureCount++;
        console.error(`💥 [${emailIndex + 1}/${emails.length}] Erro SMTP crítico para ${email.to}:`, error);
        
        // Registrar no histórico
        const emailWithSmtp = { ...email, smtp_settings: smtp_settings };
        await registerInHistory(emailWithSmtp, 'erro', error.message);
        
        return {
          email: email.to,
          success: false,
          error: error.message,
          index: emailIndex,
          method: 'SMTP'
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Delay entre lotes
    if (i + batchSize < emails.length) {
      console.log(`⏱️ Aguardando ${config.baseDelay}ms antes do próximo lote SMTP...`);
      await delay(config.baseDelay);
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const successRate = ((successCount / emails.length) * 100).toFixed(1) + '%';
  const avgThroughput = (successCount / totalDuration).toFixed(2);

  console.log(`🎯 RESUMO FINAL SMTP:
    • Total: ${emails.length}
    • Sucessos: ${successCount}
    • Falhas: ${failureCount}
    • Taxa de sucesso: ${successRate}
    • Duração: ${totalDuration.toFixed(1)}s
    • Throughput: ${avgThroughput} emails/s
    • Provedor SMTP: ${provider.charAt(0).toUpperCase() + provider.slice(1)}
    • Host: ${smtp_settings.host}
  `);

  return {
    success: successCount > 0,
    summary: {
      total: emails.length,
      successful: successCount,
      failed: failureCount,
      successRate,
      totalDuration: parseFloat(totalDuration.toFixed(1)),
      avgThroughput: parseFloat(avgThroughput),
      provider: provider,
      method: 'SMTP',
      host: smtp_settings.host
    },
    results
  };
}

async function registerInHistory(email: any, status: 'enviado' | 'erro', errorMessage?: string | null) {
  try {
    const historyRecord = {
      template_id: email.template_id || null,
      contato_id: email.contato_id || null,
      remetente_nome: email.smtp_settings?.from_name || 'Sistema',
      remetente_email: email.smtp_settings?.from_email || '',
      destinatario_nome: email.contato_nome || email.contact?.nome || 'Destinatário',
      destinatario_email: email.to,
      status: status,
      template_nome: email.subject || 'Email',
      tipo_envio: 'imediato' as const,
      mensagem_erro: errorMessage,
      user_id: email.contact?.user_id || email.user_id || '',
      data_envio: new Date().toISOString()
    };

    const { error } = await supabase
      .from('envios_historico')
      .insert([historyRecord]);

    if (error) {
      console.error('Erro ao registrar histórico:', error);
    } else {
      console.log(`📝 Histórico SMTP registrado: ${email.to} - ${status}`);
    }
  } catch (error) {
    console.error('Erro crítico ao registrar histórico:', error);
  }
}

