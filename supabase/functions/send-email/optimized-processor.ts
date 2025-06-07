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

// Função para obter data atual no formato brasileiro
function getDataHoje(): string {
  const hoje = new Date();
  return hoje.toLocaleDateString('pt-BR');
}

// Função para obter hora atual no formato brasileiro
function getHoraAtual(): string {
  const agora = new Date();
  return agora.toLocaleTimeString('pt-BR');
}

// Função para substituir variáveis no conteúdo do template
function substituirVariaveis(conteudo: string, contato: any): string {
  if (!conteudo) return '';
  
  // Mapeamento das variáveis para os valores dos contatos
  const variaveis: Record<string, string> = {
    '{{nome}}': contato?.nome || '',
    '{{email}}': contato?.email || '',
    '{{telefone}}': contato?.telefone || '',
    '{{razao_social}}': contato?.razao_social || '',
    '{{cliente}}': contato?.cliente || contato?.nome || '',
    '{{empresa}}': contato?.razao_social || contato?.empresa || 'Empresa',
    '{{cargo}}': contato?.cargo || '',
    '{{produto}}': contato?.produto || '',
    '{{valor}}': contato?.valor || '',
    '{{vencimento}}': contato?.vencimento || '',
    '{{data}}': getDataHoje(),
    '{{hora}}': getHoraAtual()
  };
  
  let conteudoProcessado = conteudo;
  
  // Substituir cada variável pelo valor correspondente
  Object.entries(variaveis).forEach(([variavel, valor]) => {
    conteudoProcessado = conteudoProcessado.split(variavel).join(valor);
  });
  
  return conteudoProcessado;
}

// Função para buscar anexos do template no banco de dados
async function buscarAnexosTemplate(templateId: string): Promise<any[]> {
  if (!templateId) {
    console.log('📎 Nenhum template_id fornecido para buscar anexos');
    return [];
  }

  try {
    console.log(`📎 Buscando anexos para template ${templateId}`);
    
    const { data: template, error } = await supabase
      .from('templates')
      .select('attachments')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar template:', error);
      return [];
    }

    if (!template || !template.attachments) {
      console.log('📎 Template sem anexos encontrado');
      return [];
    }

    // Parse dos anexos do template
    let anexosTemplate = [];
    if (typeof template.attachments === 'string') {
      try {
        anexosTemplate = JSON.parse(template.attachments);
      } catch (e) {
        console.error('❌ Erro ao fazer parse dos anexos do template:', e);
        return [];
      }
    } else if (Array.isArray(template.attachments)) {
      anexosTemplate = template.attachments;
    } else if (typeof template.attachments === 'object') {
      anexosTemplate = [template.attachments];
    }

    console.log(`📎 ${anexosTemplate.length} anexos encontrados no template`);
    return anexosTemplate;
  } catch (error) {
    console.error('❌ Erro crítico ao buscar anexos do template:', error);
    return [];
  }
}

// Função para processar anexos do template para formato do nodemailer
function processAttachments(templateAttachments: any, emailAttachments?: any): any[] {
  let allAttachments = [];
  
  // Processar anexos do template
  if (templateAttachments) {
    console.log('📎 Processando anexos do template:', templateAttachments);
    
    let attachments = [];
    
    // Se for um array
    if (Array.isArray(templateAttachments)) {
      attachments = templateAttachments;
    } 
    // Se for um objeto único
    else if (typeof templateAttachments === 'object') {
      attachments = [templateAttachments];
    }
    // Se for uma string (possivelmente JSON)
    else if (typeof templateAttachments === 'string') {
      try {
        const parsed = JSON.parse(templateAttachments);
        if (Array.isArray(parsed)) {
          attachments = parsed;
        } else {
          attachments = [parsed];
        }
      } catch (error) {
        console.error('❌ Erro ao fazer parse dos anexos do template:', error);
        attachments = [];
      }
    }

    allAttachments.push(...attachments);
  }

  // Processar anexos específicos do email (se houver)
  if (emailAttachments) {
    console.log('📎 Processando anexos específicos do email:', emailAttachments);
    
    let emailAttach = [];
    if (Array.isArray(emailAttachments)) {
      emailAttach = emailAttachments;
    } else if (typeof emailAttachments === 'object') {
      emailAttach = [emailAttachments];
    }
    
    allAttachments.push(...emailAttach);
  }

  if (allAttachments.length === 0) {
    console.log('📎 Nenhum anexo encontrado');
    return [];
  }

  // Converter para formato do nodemailer
  const nodemailerAttachments = allAttachments.map((attachment: any, index: number) => {
    console.log(`📎 Convertendo anexo ${index + 1}:`, attachment);
    
    // Formato esperado pelo nodemailer: { filename, path, contentType? }
    let converted: any = {};
    
    // Tentar diferentes formatos de dados
    if (attachment.filename && (attachment.path || attachment.url)) {
      // Formato padrão com filename e path/url
      converted = {
        filename: attachment.filename,
        path: attachment.path || attachment.url,
        contentType: attachment.contentType || attachment.content_type || attachment.type
      };
    } else if (attachment.name && (attachment.url || attachment.path)) {
      // Formato alternativo comum
      converted = {
        filename: attachment.name,
        path: attachment.url || attachment.path,
        contentType: attachment.contentType || attachment.content_type || attachment.type
      };
    } else if (attachment.file_name && attachment.file_url) {
      // Outro formato possível
      converted = {
        filename: attachment.file_name,
        path: attachment.file_url,
        contentType: attachment.content_type || attachment.type
      };
    } else if (typeof attachment === 'string') {
      // Se for apenas uma URL
      const filename = attachment.split('/').pop() || `attachment_${index + 1}`;
      converted = {
        filename: filename,
        path: attachment
      };
    } else {
      console.warn(`⚠️ Formato de anexo não reconhecido para anexo ${index + 1}:`, attachment);
      return null;
    }

    // Validar se temos os campos obrigatórios
    if (!converted.filename || !converted.path) {
      console.error(`❌ Anexo ${index + 1} inválido - faltando filename ou path:`, converted);
      return null;
    }

    // Determinar contentType se não estiver definido
    if (!converted.contentType && converted.filename) {
      const extension = converted.filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed'
      };
      converted.contentType = mimeTypes[extension] || 'application/octet-stream';
    }

    console.log(`✅ Anexo ${index + 1} convertido:`, converted);
    return converted;
  }).filter(Boolean); // Remove anexos nulos

  console.log(`📎 Total de anexos processados: ${nodemailerAttachments.length}`);
  return nodemailerAttachments;
}

// Função para limpar e validar HTML do email
function processEmailHTML(htmlContent: string): string {
  if (!htmlContent) return '';
  
  // Garantir que imagens tenham atributos corretos
  let processedHTML = htmlContent;
  
  // Corrigir tags de imagem para garantir que tenham style adequado
  processedHTML = processedHTML.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, beforeSrc, src, afterSrc) => {
      // Verificar se já tem style max-width
      if (!afterSrc.includes('max-width') && !beforeSrc.includes('max-width')) {
        // Adicionar style se não existir
        if (afterSrc.includes('style="')) {
          afterSrc = afterSrc.replace('style="', 'style="max-width: 100%; ');
        } else {
          afterSrc = ` style="max-width: 100%;"${afterSrc}`;
        }
      }
      
      // Garantir alt se não existir
      if (!afterSrc.includes('alt=') && !beforeSrc.includes('alt=')) {
        afterSrc = ` alt="Imagem"${afterSrc}`;
      }
      
      return `<img${beforeSrc}src="${src}"${afterSrc}>`;
    }
  );
  
  console.log('📧 HTML do email processado e validado');
  return processedHTML;
}

// Envio real via SMTP do usuário - ATUALIZADO com busca de anexos do template
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
    
    // Processar o conteúdo do email com substituição de variáveis
    let processedContent = email.content || email.html || '';
    let processedSubject = email.subject || '';
    
    if (email.contact) {
      processedContent = substituirVariaveis(processedContent, email.contact);
      processedSubject = substituirVariaveis(processedSubject, email.contact);
    }
    
    // Processar e limpar HTML
    processedContent = processEmailHTML(processedContent);
    
    // CORREÇÃO PRINCIPAL: Buscar anexos do template no banco de dados
    let templateAttachments = [];
    if (email.template_id) {
      templateAttachments = await buscarAnexosTemplate(email.template_id);
    }
    
    // Processar anexos: combinar anexos do template + anexos específicos do email
    let processedAttachments: any[] = [];
    if (templateAttachments.length > 0 || email.attachments) {
      console.log('📎 Processando anexos:', {
        templateAttachments: templateAttachments.length,
        emailAttachments: email.attachments ? 'presente' : 'ausente'
      });
      processedAttachments = processAttachments(templateAttachments, email.attachments);
    } else {
      console.log('📎 Nenhum anexo encontrado');
    }
    
    const mailOptions = {
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to: email.to,
      subject: processedSubject,
      html: processedContent,
      attachments: processedAttachments
    };

    console.log('📧 Configurações do email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      html_length: processedContent.length,
      has_images: processedContent.includes('<img'),
      attachments_count: processedAttachments.length,
      attachments_details: processedAttachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        hasPath: !!att.path
      }))
    });

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email enviado com sucesso para ${email.to}:`, info.messageId);
    if (processedAttachments.length > 0) {
      console.log(`📎 ${processedAttachments.length} anexo(s) enviado(s) com sucesso`);
    }
    return info.accepted && info.accepted.length > 0;
  } catch (error: any) {
    console.error(`❌ Erro ao enviar email via SMTP para ${email.to}:`, error);
    if (error.message?.includes('attachment')) {
      console.error('❌ Erro específico de anexo:', error.message);
    }
    return false;
  }
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
        message: `Email enviado com sucesso para ${email.to}`,
        method: 'SMTP'
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
        
        // Log de anexos se existirem
        if (email.attachments || email.template_id) {
          console.log(`📎 [${emailIndex + 1}/${emails.length}] Email com template_id: ${email.template_id} - verificando anexos`);
        }
        
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

// CORREÇÃO: Registro no histórico com validação completa e fallback para user_id
async function registerInHistory(email: any, status: 'enviado' | 'erro', errorMessage?: string | null) {
  try {
    // Buscar user_id através de múltiplas fontes
    let user_id = email.contact?.user_id || email.user_id;
    
    // Se não conseguiu user_id do email, tentar buscar via contato_id
    if (!user_id && email.contato_id) {
      console.log('🔍 Buscando user_id via contato_id:', email.contato_id);
      const { data: contato } = await supabase
        .from('contatos')
        .select('user_id')
        .eq('id', email.contato_id)
        .single();
      
      if (contato) {
        user_id = contato.user_id;
        console.log('✅ user_id encontrado via contato:', user_id);
      }
    }
    
    // Se ainda não tem user_id, tentar buscar via template_id
    if (!user_id && email.template_id) {
      console.log('🔍 Buscando user_id via template_id:', email.template_id);
      const { data: template } = await supabase
        .from('templates')
        .select('user_id')
        .eq('id', email.template_id)
        .single();
      
      if (template) {
        user_id = template.user_id;
        console.log('✅ user_id encontrado via template:', user_id);
      }
    }
    
    if (!user_id) {
      console.error('❌ Não foi possível determinar user_id para registrar histórico');
      return;
    }

    // Validar status
    if (!['enviado', 'erro'].includes(status)) {
      console.error('❌ Status inválido para histórico:', status);
      return;
    }

    const historyRecord = {
      template_id: email.template_id || null,
      contato_id: email.contato_id || null,
      remetente_nome: email.smtp_settings?.from_name || 'Sistema',
      remetente_email: email.smtp_settings?.from_email || '',
      destinatario_nome: email.contato_nome || email.contact?.nome || 'Destinatário',
      destinatario_email: email.to,
      status: status,
      template_nome: email.subject || 'Email',
      tipo_envio: 'imediato',
      mensagem_erro: errorMessage,
      user_id: user_id,
      data_envio: new Date().toISOString()
    };

    console.log('📝 Registrando histórico:', {
      user_id: historyRecord.user_id,
      status: historyRecord.status,
      tipo_envio: historyRecord.tipo_envio,
      email: historyRecord.destinatario_email
    });

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
