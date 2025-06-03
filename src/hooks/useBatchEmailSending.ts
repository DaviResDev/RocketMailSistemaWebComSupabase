
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

export function useBatchEmailSending() {
  const [isSending, setIsSending] = useState(false);
  const { sendBatchEmails, processTemplateVariables } = useEnvios();

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

    setIsSending(true);

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

      // Prepare email data for batch sending
      const emailsData = selectedContacts.map(contato => {
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

      console.log(`Preparados ${emailsData.length} emails para envio em lote`);

      // Send emails using the batch function
      const result = await sendBatchEmails(emailsData);

      if (result && result.summary) {
        console.log('Resultado do envio em lote:', result.summary);
        
        if (result.summary.successful === emailsData.length) {
          toast.success(`Todos os ${result.summary.successful} emails foram enviados com sucesso! 🎉`);
        } else if (result.summary.successful > 0) {
          toast.success(`${result.summary.successful} de ${result.summary.total} emails enviados com sucesso (${result.summary.successRate}% de taxa de sucesso)`);
        } else {
          toast.error('Nenhum email foi enviado com sucesso. Verifique as configurações.');
        }

        return result;
      } else {
        toast.error('Erro no envio em lote dos emails');
        return false;
      }

    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      toast.error(`Erro no envio em lote: ${error.message || 'Erro desconhecido'}`);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    isSending,
    sendEmailsInBatch
  };
}

export default useBatchEmailSending;
