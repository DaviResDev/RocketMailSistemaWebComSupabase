import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { normalizeTipoEnvio } from './shared-types.ts';

interface EmailRequest {
  templateId: string;
  contactId: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  tipoEnvio?: string;
  templateName?: string;
}

interface BatchProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  templateId: string;
  contactId: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  tipoEnvio?: string;
  templateName?: string;
}

interface DatabaseResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function processBatchEmails(
  emailBatch: EmailRequest[],
  supabase: SupabaseClient,
  userId: string
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  console.log(`📤 Iniciando processamento em lote de ${emailBatch.length} emails`);
  
  const results: BatchProcessingResult[] = [];

  if (!emailBatch || emailBatch.length === 0) {
    console.warn("Nenhum email para processar.");
    return {
      success: true,
      message: "Nenhum email para processar.",
      templateId: '',
      contactId: '',
      fromName: '',
      fromEmail: '',
      toName: '',
      toEmail: ''
    };
  }

  try {
    for (const email of emailBatch) {
      try {
        // Validar dados do email
        if (!email.templateId || !email.contactId || !email.fromName || !email.fromEmail || !email.toName || !email.toEmail) {
          console.error("Dados incompletos do email:", email);
          results.push({
            success: false,
            error: "Dados incompletos do email",
            templateId: email.templateId,
            contactId: email.contactId,
            fromName: email.fromName,
            fromEmail: email.fromEmail,
            toName: email.toName,
            toEmail: email.toEmail,
            tipoEnvio: email.tipoEnvio,
            templateName: email.templateName
          });
          continue;
        }

        // Enviar email (simulado)
        console.log(`Enviando email para ${email.toEmail} (template: ${email.templateId})`);
        
        results.push({
          success: true,
          message: `Email enviado para ${email.toEmail}`,
          templateId: email.templateId,
          contactId: email.contactId,
          fromName: email.fromName,
          fromEmail: email.fromEmail,
          toName: email.toName,
          toEmail: email.toEmail,
          tipoEnvio: email.tipoEnvio,
          templateName: email.templateName
        });

      } catch (error: any) {
        console.error("Erro ao processar email:", error);
        results.push({
          success: false,
          error: error.message || "Erro desconhecido ao enviar email",
          templateId: email.templateId,
          contactId: email.contactId,
          fromName: email.fromName,
          fromEmail: email.fromEmail,
          toName: email.toName,
          toEmail: email.toEmail,
          tipoEnvio: email.tipoEnvio,
          templateName: email.templateName
        });
      }
    }

    // Salvar histórico
    if (results.length > 0) {
      console.log(`💾 Salvando ${results.length} registros no histórico...`);
      
      const historicoRecords = results.map(result => {
        // Normalizar o tipo_envio antes de salvar
        const normalizedTipoEnvio = normalizeTipoEnvio(result.tipoEnvio || 'lote');
        
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
        console.error("Erro ao salvar histórico:", dbError);
        throw dbError;
      } else {
        console.log("✅ Histórico salvo com sucesso.");
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`📊 Processamento em lote concluído em ${duration} segundos.`);

    return {
      success: true,
      message: `Processamento em lote concluído com ${results.length} emails`,
      templateId: '',
      contactId: '',
      fromName: '',
      fromEmail: '',
      toName: '',
      toEmail: ''
    };

  } catch (error: any) {
    console.error("Erro no processamento em lote:", error);
    return {
      success: false,
      error: error.message || "Erro desconhecido no processamento em lote",
      templateId: '',
      contactId: '',
      fromName: '',
      fromEmail: '',
      toName: '',
      toEmail: ''
    };
  }
}
