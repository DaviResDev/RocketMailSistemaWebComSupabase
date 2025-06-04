
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BatchProgress {
  current: number;
  total: number;
}

interface EmailJob {
  contactId: string;
  templateId: string;
  contactName: string;
  contactEmail: string;
  customSubject?: string;
  customContent?: string;
}

interface BatchOptions {
  showProgress?: boolean;
  enableOptimizations?: boolean;
  useParallelSending?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
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

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });

    try {
      console.log(`Iniciando envio em lote para ${selectedContacts.length} contatos`);
      
      // Get user SMTP settings first to determine sending mode
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Prepare SMTP settings if configured and use_smtp is enabled
      const smtpSettings = userSettings?.use_smtp && userSettings?.smtp_host ? {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || '',
        from_email: userSettings.email_usuario || ''
      } : null;
      
      // Create email jobs
      const emailJobs = selectedContacts.map(contact => ({
        contactId: contact.id,
        templateId: templateId,
        contactName: contact.nome,
        contactEmail: contact.email,
        customSubject: customSubject || templateData.descricao || templateData.nome,
        customContent: customContent || templateData.conteudo,
        // These fields are needed for proper template processing
        contact: contact,
        template: templateData,
        attachments: templateData.attachments,
        signature_image: userSettings?.signature_image || templateData.signature_image
      }));

      // For SMTP, we need to send through our edge function with batch mode enabled
      // to ensure proper processing of templates and variables
      const batchRequestData = {
        batch: true,
        emails: emailJobs.map(job => ({
          to: job.contactEmail,
          contato_id: job.contactId,
          template_id: job.templateId,
          contato_nome: job.contactName,
          content: job.customContent,
          subject: job.customSubject,
          contact: job.contact,
          image_url: job.template.image_url,
          signature_image: job.signature_image,
          attachments: job.attachments
        })),
        smtp_settings: smtpSettings,
        use_smtp: userSettings?.use_smtp || false
      };
      
      console.log("Sending batch email with configuration:", {
        batch_size: emailJobs.length,
        use_smtp: userSettings?.use_smtp,
        has_smtp_settings: !!smtpSettings,
        template_id: templateId,
        template_name: templateData.nome
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Failed response from send-email:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote");
      }
      
      const { summary, results } = responseData;
      
      // Update progress
      setProgress({ current: selectedContacts.length, total: selectedContacts.length });
      
      // Enhanced results display with delivery method information
      if (summary.successful > 0) {
        let successMessage = `${summary.successful} emails enviados com sucesso!`;
        if (summary.smtp > 0) {
          successMessage += ` (${summary.smtp} via SMTP)`;
        }
        if (summary.resend > 0) {
          successMessage += ` (${summary.resend} via Resend)`;
        }
        toast.success(successMessage);
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
        
        // Log failed emails for debugging
        console.warn("Failed emails:", failedEmails);
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
        console.error("Error saving to envios table:", err);
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
    isSending: isProcessing, // Keep backward compatibility
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails: sendEmailsInBatch // Alias for backward compatibility
  };
}

export default useBatchEmailSending;
