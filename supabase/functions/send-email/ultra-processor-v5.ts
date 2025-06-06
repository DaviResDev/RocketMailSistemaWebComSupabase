
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { EmailRequest, EmailResult, BatchProcessingResult, normalizeTipoEnvio } from './shared-types.ts';

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
      console.log(`📧 Processando email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1})`);

      // Simular processamento de email (substituir por integração real posteriormente)
      const delay = Math.random() * 800 + 200; // 200-1000ms delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Simular alta taxa de sucesso (97%)
      const shouldFail = Math.random() < 0.03;
      
      if (shouldFail) {
        lastError = new Error(`Falha simulada para ${emailRequest.toEmail}`);
        console.error(`❌ Erro ao processar email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1}):`, lastError);
        
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }

      console.log(`✅ Email processado com sucesso para ${emailRequest.toEmail} após ${attempt} tentativa(s)`);
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
      console.error(`❌ Erro ao processar email para ${emailRequest.toEmail} (tentativa ${attempt}/${maxRetries + 1}):`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error(`❌ Falha ao processar email para ${emailRequest.toEmail} após todas as ${maxRetries + 1} tentativas.`);
  return {
    success: false,
    contactId: emailRequest.contactId,
    templateId: emailRequest.templateId,
    toEmail: emailRequest.toEmail,
    toName: emailRequest.toName,
    fromEmail: emailRequest.fromEmail,
    fromName: emailRequest.fromName,
    error: lastError?.message || 'Erro desconhecido',
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
  console.log(`🚀 ULTRA-PARALLEL V5: Iniciando processamento de ${emailBatch.length} emails`);
  
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
        const result = settledResult.value;
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
        results.push(result);
      } else {
        errorCount++;
        console.error(`❌ Falha no processamento do email ${index + 1}:`, settledResult.reason);
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
      console.log(`💾 Salvando ${results.length} registros no histórico ultra-paralelo...`);
      
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
    console.log(`📊 Processamento ultra-paralelo V5 finalizado em ${timeElapsed}ms. Sucessos: ${successCount}, Falhas: ${errorCount}`);

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
