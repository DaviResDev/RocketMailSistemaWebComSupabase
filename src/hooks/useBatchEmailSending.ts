
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEnvios } from './useEnvios';

interface BatchEmailData {
  contato_id: string;
  template_id: string;
  contato: {
    nome: string;
    email: string;
    telefone?: string;
    razao_social?: string;
    cliente?: string;
  };
  template: {
    nome: string;
    conteudo: string;
    signature_image?: string;
    image_url?: string;
    attachments?: any;
  };
}

interface BatchOptions {
  showProgress?: boolean;
  enableOptimizations?: boolean;
  useParallelSending?: boolean;
}

interface BatchProgress {
  current: number;
  total: number;
}

export function useBatchEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0 });
  const { sendBatchEmails: originalSendBatchEmails, processTemplateVariables } = useEnvios();

  const sendEmailsInBatch = async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ) => {
    if (!selectedContacts.length || !templateId) {
      toast.error('Selecione contatos e um template para envio em lote');
      return false;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });

    try {
      console.log(`Iniciando preparação de envio em lote para ${selectedContacts.length} contatos`);

      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) {
        console.error('Erro ao buscar template:', templateError);
        toast.error('Erro ao buscar dados do template');
        return false;
      }

      // Get user settings for signature
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image')
        .single();

      const signatureImage = userSettings?.signature_image || templateData.signature_image;

      // Process attachments
      let parsedAttachments = null;
      if (templateData.attachments) {
        try {
          if (typeof templateData.attachments === 'string' && templateData.attachments !== '[]') {
            parsedAttachments = JSON.parse(templateData.attachments);
          } else if (Array.isArray(templateData.attachments)) {
            parsedAttachments = templateData.attachments;
          } else if (templateData.attachments && typeof templateData.attachments === 'object') {
            parsedAttachments = [templateData.attachments];
          }
        } catch (err) {
          console.error('Erro ao analisar anexos do template:', err);
          parsedAttachments = null;
        }
      }

      // Validate emails before processing
      const validContacts = selectedContacts.filter(contato => {
        const isValidEmail = /\S+@\S+\.\S+/.test(contato.email);
        if (!isValidEmail) {
          console.warn(`Email inválido ignorado: ${contato.email}`);
        }
        return isValidEmail;
      });

      if (validContacts.length !== selectedContacts.length) {
        const invalidCount = selectedContacts.length - validContacts.length;
        toast.warning(`${invalidCount} contatos com emails inválidos foram ignorados`);
      }

      if (validContacts.length === 0) {
        toast.error('Nenhum contato com email válido encontrado');
        return false;
      }

      // Prepare email data for batch sending
      const emailsData = validContacts.map(contato => {
        // Process template content with contact variables
        const processedContent = customContent || processTemplateVariables(templateData.conteudo, contato);
        
        const emailSubject = customSubject || templateData.descricao || templateData.nome || "Sem assunto";

        return {
          to: contato.email,
          contato_nome: contato.nome,
          contato_id: contato.id,
          template_id: templateId,
          subject: emailSubject,
          content: processedContent,
          signature_image: signatureImage,
          image_url: templateData.image_url,
          attachments: parsedAttachments
        };
      });

      console.log(`Preparados ${emailsData.length} emails válidos para envio em lote`);

      // Send emails using the batch function
      const result = await originalSendBatchEmails(emailsData);

      if (result && result.summary) {
        console.log('Resultado do envio em lote:', result.summary);
        
        if (result.summary.successful === emailsData.length) {
          toast.success(`Todos os ${result.summary.successful} emails foram enviados com sucesso! 🎉`);
        } else if (result.summary.successful > 0) {
          toast.success(`${result.summary.successful} de ${result.summary.total} emails enviados com sucesso (${result.summary.successRate}% de taxa de sucesso)`);
          
          // Show additional info about failures
          if (result.summary.failed > 0) {
            const failureReasons = result.results
              ?.filter((r: any) => !r.success)
              ?.map((r: any) => r.error)
              ?.slice(0, 3) || [];
            
            if (failureReasons.length > 0) {
              console.warn('Principais razões de falha:', failureReasons);
            }
          }
        } else {
          toast.error('Nenhum email foi enviado com sucesso. Verifique as configurações de envio.');
        }

        setProgress({ current: result.summary.successful, total: result.summary.total });
        return result;
      } else {
        toast.error('Erro no envio em lote dos emails');
        return false;
      }

    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      
      // Provide specific error messages based on error content
      let errorMessage = 'Erro no envio em lote';
      if (error.message?.includes('autenticação')) {
        errorMessage = 'Falha de autenticação: Verifique suas configurações de email';
      } else if (error.message?.includes('configuração')) {
        errorMessage = 'Erro de configuração: Configure SMTP ou Resend nas configurações';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBatchEmails = async (emailJobs: any[], options?: BatchOptions) => {
    if (!emailJobs.length) {
      toast.error('Nenhum email para enviar');
      return { success: false };
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: emailJobs.length });

    try {
      // Validate email jobs before processing
      const validEmailJobs = emailJobs.filter(job => {
        const isValidEmail = /\S+@\S+\.\S+/.test(job.contactEmail || '');
        if (!isValidEmail) {
          console.warn(`Email inválido no job ignorado: ${job.contactEmail}`);
        }
        return isValidEmail && job.contactEmail;
      });

      if (validEmailJobs.length !== emailJobs.length) {
        const invalidCount = emailJobs.length - validEmailJobs.length;
        toast.warning(`${invalidCount} jobs com emails inválidos foram ignorados`);
      }

      if (validEmailJobs.length === 0) {
        toast.error('Nenhum job com email válido encontrado');
        return { success: false };
      }

      // Map emailJobs to the expected format
      const emailsData = validEmailJobs.map(job => ({
        to: job.contactEmail,
        contato_nome: job.contactName || '',
        contato_id: job.contactId || '',
        template_id: job.templateId || '',
        subject: job.subject || 'Sem assunto',
        content: job.content || '',
        signature_image: job.signatureImage || null,
        image_url: job.imageUrl || null,
        attachments: job.attachments || null
      }));

      const result = await originalSendBatchEmails(emailsData);

      if (result && result.summary) {
        setProgress({ current: result.summary.successful, total: result.summary.total });
        
        if (result.summary.successful === emailsData.length) {
          toast.success(`Todos os ${result.summary.successful} emails foram enviados com sucesso! 🎉`);
          return { success: true, result };
        } else if (result.summary.successful > 0) {
          toast.success(`${result.summary.successful} de ${result.summary.total} emails enviados com sucesso (${result.summary.successRate}% de taxa de sucesso)`);
          return { success: true, result };
        } else {
          toast.error('Nenhum email foi enviado com sucesso. Verifique as configurações de envio.');
          return { success: false };
        }
      } else {
        toast.error('Erro no envio em lote dos emails');
        return { success: false };
      }

    } catch (error: any) {
      console.error('Erro no sendBatchEmails:', error);
      
      // Provide specific error messages
      let errorMessage = 'Erro no envio';
      if (error.message?.includes('autenticação')) {
        errorMessage = 'Falha de autenticação: Verifique suas configurações';
      } else if (error.message?.includes('configuração')) {
        errorMessage = 'Erro de configuração: Configure SMTP ou Resend';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isSending: isProcessing, // Keep backward compatibility
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails
  };
}

export default useBatchEmailSending;
