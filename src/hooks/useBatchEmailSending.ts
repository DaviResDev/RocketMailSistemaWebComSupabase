
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BatchProgress {
  current: number;
  total: number;
}

export function useBatchEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0 });

  const sendEmailsInBatch = async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ) => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio');
      return false;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return false;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });

    try {
      console.log(`Iniciando envio em lote para ${selectedContacts.length} contatos`);
      
      // Get user SMTP settings - batch sending requires SMTP
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio em lote. Configure o SMTP nas configurações.');
      }
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Prepare SMTP settings
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Create email jobs with all necessary data for template processing
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        contact: contact, // Full contact data for variable substitution
        image_url: templateData.image_url,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        attachments: templateData.attachments
      }));

      const batchRequestData = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        use_smtp: true // Force SMTP usage for batch sends
      };
      
      console.log("Enviando lote de emails com configuração SMTP:", {
        batch_size: emailJobs.length,
        use_smtp: true,
        smtp_host: smtpSettings.host,
        template_id: templateId,
        template_name: templateData.nome
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Erro na edge function:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha do send-email:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote");
      }
      
      const { summary, results } = responseData;
      
      // Update progress
      setProgress({ current: selectedContacts.length, total: selectedContacts.length });
      
      // Show success message
      if (summary.successful > 0) {
        toast.success(`${summary.successful} emails enviados com sucesso via SMTP!`);
      }
      
      if (summary.failed > 0) {
        const failedEmails = results.filter((r: any) => !r.success);
        const errorMessages = [...new Set(failedEmails.map((r: any) => r.error))].slice(0, 3);
        
        toast.error(
          `${summary.failed} emails falharam no envio. Taxa de sucesso: ${summary.successRate}%`,
          {
            description: errorMessages.join('; '),
            duration: 10000
          }
        );
        
        console.warn("Emails com falha:", failedEmails);
      }
      
      // Create entries in envios table for successful sends
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const successfulResults = results.filter((r: any) => r.success);
          const envioRecords = successfulResults.map((result: any) => {
            const email = result.to;
            const contact = selectedContacts.find(c => c.email === email || (typeof email === 'string' && email.includes(c.email)));
            
            return {
              contato_id: contact?.id,
              template_id: templateId,
              status: 'enviado',
              user_id: user.user.id,
              data_envio: new Date().toISOString()
            };
          }).filter(record => record.contato_id);
          
          if (envioRecords.length > 0) {
            await supabase.from('envios').insert(envioRecords);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar na tabela envios:", err);
      }

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        successRate: summary.successRate
      };
    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      toast.error(`Erro no envio em lote: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isSending: isProcessing,
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails: sendEmailsInBatch
  };
}

export default useBatchEmailSending;
