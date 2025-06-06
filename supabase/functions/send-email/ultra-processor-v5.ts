import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { EmailRequest, BatchProcessingResult, EmailResult, TipoEnvio } from './shared-types.ts';
import { normalizeTipoEnvio } from './shared-types.ts';

interface UltraProcessorOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

const defaultUltraProcessorOptions: UltraProcessorOptions = {
  maxRetries: 3,
  timeoutMs: 30000,
};

async function sendEmailWithRetry(
  emailRequest: EmailRequest,
  supabase: SupabaseClient,
  options: UltraProcessorOptions = defaultUltraProcessorOptions
): Promise<EmailResult> {
  const { maxRetries = 3, timeoutMs = 30000 } = options;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      attempt++;
      console.log(`📧 Enviando email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1})`);

      const response = await fetch(emailRequest.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emailRequest.apiKey}`,
        },
        body: JSON.stringify({
          from: emailRequest.fromEmail,
          to: emailRequest.toEmail,
          subject: emailRequest.subject,
          html: emailRequest.htmlContent,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = new Error(`Falha ao enviar email: ${response.status} - ${errorBody}`);
        console.error(`❌ Erro ao enviar email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1}):`, lastError);

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.warn(`⏳ Rate limit atingido. Aguardando ${delay / 1000} segundos antes de tentar novamente.`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        continue;
      }

      console.log(`✅ Email enviado com sucesso para ${emailRequest.toEmail} após ${attempt} tentativa(s)`);
      return {
        success: true,
        contactId: emailRequest.contactId,
        templateId: emailRequest.templateId,
        toEmail: emailRequest.toEmail,
        toName: emailRequest.toName,
        fromEmail: emailRequest.fromEmail,
        fromName: emailRequest.fromName,
        templateName: emailRequest.templateName,
        tipoEnvio: emailRequest.tipoEnvio,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Erro ao enviar email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1}):`, error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.error(`❌ Falha ao enviar email para ${emailRequest.toEmail} após todas as ${maxRetries + 1} tentativas.`);
  return {
    success: false,
    contactId: emailRequest.contactId,
    templateId: emailRequest.templateId,
    toEmail: emailRequest.toEmail,
    toName: emailRequest.toName,
    fromEmail: emailRequest.fromEmail,
    fromName: emailRequest.fromName,
    error: lastError.message || 'Erro desconhecido',
    templateName: emailRequest.templateName,
    tipoEnvio: emailRequest.tipoEnvio,
  };
}

export async function processUltraParallelV5(
  emailBatch: EmailRequest[],
  supabase: SupabaseClient,
  userId: string
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  console.log(`🚀 ULTRA-OPTIMIZED V3.0: Iniciando processamento de ${emailBatch.length} emails`);
  
  if (!emailBatch || emailBatch.length === 0) {
    console.warn('📦 Lote de emails vazio. Nada para processar.');
    return {
      successCount: 0,
      errorCount: 0,
      totalCount: 0,
      timeElapsed: 0,
      results: [],
    };
  }

  const totalEmails = emailBatch.length;
  let successCount = 0;
  let errorCount = 0;
  const results: EmailResult[] = [];

  try {
    const emailPromises = emailBatch.map(emailRequest =>
      sendEmailWithRetry(emailRequest, supabase)
    );

    const settledResults = await Promise.allSettled(emailPromises);

    settledResults.forEach((settledResult, index) => {
      if (settledResult.status === 'fulfilled') {
        successCount++;
        results.push(settledResult.value);
      } else {
        errorCount++;
        console.error(`❌ Falha no envio do email ${index + 1}:`, settledResult.reason);
        const originalRequest = emailBatch[index];
        results.push({
          success: false,
          contactId: originalRequest.contactId,
          templateId: originalRequest.templateId,
          toEmail: originalRequest.toEmail,
          toName: originalRequest.toName,
          fromEmail: originalRequest.fromEmail,
          fromName: originalRequest.fromName,
          error: settledResult.reason?.message || 'Erro desconhecido',
          templateName: originalRequest.templateName,
          tipoEnvio: originalRequest.tipoEnvio,
        });
      }
    });

    // Salvar histórico em lote ultra-otimizado
    if (results.length > 0) {
      console.log(`💾 Salvando ${results.length} registros no histórico ultra-otimizado...`);
      
      const historicoRecords = results.map(result => {
        // Normalizar o tipo_envio antes de salvar
        const normalizedTipoEnvio = normalizeTipoEnvio(result.tipoEnvio || 'ultra_parallel_v5');
        
        return {
          user_id: userId,
          template_id: result.templateId,
          contato_id: result.contactId,
          remetente_nome: result.fromName,
          remetente_email: result.fromEmail,
          destinatario_nome: result.toName,
          destinatario_email: result.toEmail,
          status: result.success ? 'entregue' : 'erro',
          mensagem_erro: result.error || null,
          tipo_envio: normalizedTipoEnvio, // Usar valor normalizado
          template_nome: result.templateName || null,
          data_envio: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
      });

      const { error: dbError } = await supabase
        .from('envios_historico')
        .insert(historicoRecords);

      if (dbError) {
        console.error('❌ Erro ao salvar histórico em lote:', dbError);
      } else {
        console.log(`✅ Histórico salvo com sucesso (${results.length} registros).`);
      }
    }

    const timeElapsed = Date.now() - startTime;
    console.log(`📊 Processamento ultra-paralelo V3.0 finalizado em ${timeElapsed}ms. Sucessos: ${successCount}, Falhas: ${errorCount}`);

    return {
      successCount,
      errorCount,
      totalCount: totalEmails,
      timeElapsed,
      results,
    };

  } catch (error) {
    console.error("❌ Erro durante o processamento ultra-paralelo:", error);
    return {
      successCount: 0,
      errorCount: totalEmails,
      totalCount: totalEmails,
      timeElapsed: Date.now() - startTime,
      results: emailBatch.map(emailRequest => ({
        success: false,
        contactId: emailRequest.contactId,
        templateId: emailRequest.templateId,
        toEmail: emailRequest.toEmail,
        toName: emailRequest.toName,
        fromEmail: emailRequest.fromEmail,
        fromName: emailRequest.fromName,
        error: (error as any).message || 'Erro desconhecido',
        templateName: emailRequest.templateName,
		tipoEnvio: emailRequest.tipoEnvio,
      })),
    };
  }
}
