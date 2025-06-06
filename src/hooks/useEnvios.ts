import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Envio, EnvioFormData } from '@/types/envios';
import { useOptimizedEmailSending } from './useOptimizedEmailSending';

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendSingleEmail, sendBulkEmails } = useOptimizedEmailSending();
  
  const fetchEnvios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Usuário não autenticado');
      
      const { data: enviosData, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contato_id(*),
          template:template_id(*)
        `)
        .eq('user_id', data.user.id)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      
      setEnvios(enviosData || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de envios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimized template variable processing
  const processTemplateVariables = (content: string, contatoData: any) => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR');
    const formattedTime = currentDate.toLocaleTimeString('pt-BR');
    
    const replacements: Record<string, string> = {
      '{{nome}}': contatoData?.nome || '',
      '{{email}}': contatoData?.email || '',
      '{{telefone}}': contatoData?.telefone || '',
      '{{razao_social}}': contatoData?.razao_social || '',
      '{{cliente}}': contatoData?.cliente || '',
      '{{empresa}}': contatoData?.razao_social || 'Empresa',
      '{{cargo}}': contatoData?.cargo || 'Cargo',
      '{{produto}}': contatoData?.produto || 'Produto',
      '{{valor}}': contatoData?.valor || 'Valor',
      '{{vencimento}}': contatoData?.vencimento || 'Vencimento',
      '{{data}}': formattedDate,
      '{{hora}}': formattedTime
    };
    
    let processedContent = content;
    Object.entries(replacements).forEach(([variable, value]) => {
      processedContent = processedContent.split(variable).join(value);
    });
    
    return processedContent;
  };

  // Enhanced send email function with optimized retry logic
  const sendEmail = async (formData: EnvioFormData) => {
    setSending(true);
    
    try {
      const recipientEmail = formData.to;
      let contatoEmail = recipientEmail;
      let contatoNome = formData.contato_nome;
      let contatoData: any = null;
      
      if (!recipientEmail && formData.contato_id) {
        const { data: fetchedContatoData, error: contatoError } = await supabase
          .from('contatos')
          .select('*')
          .eq('id', formData.contato_id)
          .single();
        
        if (contatoError) {
          toast.error(`Não foi possível encontrar o contato: ${contatoError.message}`);
          setSending(false);
          return false;
        }
        
        contatoData = fetchedContatoData;
        contatoEmail = contatoData.email;
        contatoNome = contatoData.nome;
      }
      
      if (!contatoEmail) {
        toast.error('Email do destinatário não encontrado');
        setSending(false);
        return false;
      }
      
      // Get template and process content
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', formData.template_id)
        .single();
        
      if (templateError) {
        toast.error('Erro ao buscar template');
        setSending(false);
        return false;
      }

      // Process template content
      let processedContent = formData.content;
      if (!processedContent && templateData) {
        processedContent = processTemplateVariables(templateData.conteudo, contatoData);
      }
      
      // Handle attachments
      let parsedAttachments = formData.attachments;
      if (!parsedAttachments && templateData?.attachments) {
        try {
          if (typeof templateData.attachments === 'string') {
            parsedAttachments = JSON.parse(templateData.attachments);
          } else if (Array.isArray(templateData.attachments)) {
            parsedAttachments = templateData.attachments;
          } else {
            parsedAttachments = [templateData.attachments];
          }
        } catch (e) {
          console.error('Erro ao analisar anexos:', e);
          parsedAttachments = [];
        }
      }
      
      const emailSubject = formData.subject || templateData?.descricao || templateData?.nome || "Sem assunto";
      
      const emailDataToSend = {
        to: contatoEmail,
        contato_id: formData.contato_id,
        template_id: formData.template_id,
        contato_nome: contatoNome,
        subject: emailSubject,
        content: processedContent,
        template_nome: templateData?.nome,
        contact: contatoData,
        attachments: parsedAttachments
      };
      
      console.log("Sending single email with optimized sender:", emailDataToSend);
      
      const success = await sendSingleEmail(emailDataToSend);
      
      if (success) {
        // Create entry in envios table
        if (formData.contato_id && formData.template_id) {
          try {
            const { data: user } = await supabase.auth.getUser();
            if (user.user) {
              const envioRecord = {
                contato_id: formData.contato_id,
                template_id: formData.template_id,
                status: 'enviado',
                user_id: user.user.id,
                data_envio: new Date().toISOString()
              };
              
              const extraFields = formData.agendamento_id ? { agendamento_id: formData.agendamento_id } : {};
              
              await supabase.from('envios').insert({
                ...envioRecord,
                ...extraFields
              });
            }
          } catch (err) {
            console.error("Error saving to envios table:", err);
          }
        }
        
        await fetchEnvios();
      }
      
      return success;
        
    } catch (err: any) {
      console.error('Erro ao enviar email:', err);
      toast.error(`Erro ao enviar email: ${err.message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Enhanced batch email sending with optimized processing
  const sendBatchEmails = async (emailsData: any[]) => {
    setSending(true);
    
    try {
      console.log(`Iniciando envio em lote otimizado para ${emailsData.length} destinatários`);
      
      // Enhance emails data with contact information for proper variable substitution
      const enhancedEmailsData = await Promise.all(emailsData.map(async (emailData) => {
        if (emailData.contato_id) {
          const { data: contactData } = await supabase
            .from('contatos')
            .select('*')
            .eq('id', emailData.contato_id)
            .single();
            
          return {
            ...emailData,
            contact: contactData
          };
        }
        return emailData;
      }));
      
      const success = await sendBulkEmails(enhancedEmailsData, emailsData[0]?.template_id || '');
      
      if (success) {
        // Create entries in envios table for successful sends
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const envioRecords = emailsData.map((emailData) => ({
              contato_id: emailData?.contato_id,
              template_id: emailData?.template_id,
              status: 'enviado',
              user_id: user.user.id,
              data_envio: new Date().toISOString()
            })).filter(record => record.contato_id && record.template_id);
            
            if (envioRecords.length > 0) {
              await supabase.from('envios').insert(envioRecords);
            }
          }
        } catch (err) {
          console.error("Error saving batch envios to database:", err);
        }
        
        await fetchEnvios();
      }
      
      return success;
        
    } catch (err: any) {
      console.error('Erro no envio em lote:', err);
      toast.error(`Erro no envio em lote: ${err.message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  const resendEnvio = async (id: string) => {
    setSending(true);
    
    try {
      const { data: envio, error: envioError } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contato_id(*)
        `)
        .eq('id', id)
        .single();
      
      if (envioError) throw envioError;
      
      const loadingToastId = toast.loading(`Reenviando email para ${envio.contato.nome}...`);
      
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', envio.template_id)
        .single();
        
      if (templateError) throw templateError;
      
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();

      let parsedAttachments = null;
      if (templateData.attachments) {
        try {
          if (typeof templateData.attachments === 'string' && templateData.attachments !== '[]') {
            parsedAttachments = JSON.parse(templateData.attachments);
          } else if (Array.isArray(templateData.attachments)) {
            parsedAttachments = templateData.attachments;
          } else {
            parsedAttachments = [templateData.attachments];
          }
        } catch (err) {
          console.error('Erro ao analisar anexos:', err);
        }
      }
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id,
        attachments: parsedAttachments,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        subject: templateData.descricao || templateData.nome
      });
      
      toast.dismiss(loadingToastId);
      
      if (result) {
        await supabase
          .from('envios')
          .update({ status: 'reenviado' })
          .eq('id', id);
          
        toast.success(`Email reenviado com sucesso para ${envio.contato.nome}!`);
      }
      
      return result;
    } catch (err: any) {
      console.error('Erro ao reenviar email:', err);
      toast.error(`Erro ao reenviar email: ${err.message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        fetchEnvios();
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  return {
    envios,
    loading,
    error,
    sending,
    fetchEnvios,
    sendEmail,
    sendBatchEmails,
    resendEnvio,
    processTemplateVariables
  };
}

export default useEnvios;
