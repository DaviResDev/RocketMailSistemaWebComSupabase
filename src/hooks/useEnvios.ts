import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Envio, EnvioFormData, parseAttachments } from '@/types/envios';

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Optimized template variable processing with memoization
  const processTemplateVariables = (content: string, contatoData: any) => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR');
    const formattedTime = currentDate.toLocaleTimeString('pt-BR');
    
    // Create replacements object once
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
      '{{hora}}': formattedTime,
      // Legacy format support
      '{nome}': contatoData?.nome || '',
      '{email}': contatoData?.email || '',
      '{telefone}': contatoData?.telefone || '',
      '{razao_social}': contatoData?.razao_social || '',
      '{cliente}': contatoData?.cliente || '',
      '{empresa}': contatoData?.razao_social || 'Empresa',
      '{cargo}': contatoData?.cargo || 'Cargo',
      '{produto}': contatoData?.produto || 'Produto',
      '{valor}': contatoData?.valor || 'Valor',
      '{vencimento}': contatoData?.vencimento || 'Vencimento',
      '{data}': formattedDate,
      '{hora}': formattedTime
    };
    
    // Use a single pass replacement for better performance
    let processedContent = content;
    Object.entries(replacements).forEach(([variable, value]) => {
      // Use global replace for all occurrences
      processedContent = processedContent.replaceAll(variable, value);
    });
    
    return processedContent;
  };

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
      
      // Show initial progress toast - return the ID for later dismissal
      const loadingToastId = toast.loading(`Iniciando envio para ${contatoNome || contatoEmail}...`);
      
      try {
        // Get template and user settings in parallel
        const [templateResult, userSettingsResult] = await Promise.all([
          supabase
            .from('templates')
            .select('*')
            .eq('id', formData.template_id)
            .single(),
          supabase
            .from('configuracoes')
            .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_seguranca, smtp_nome, use_smtp')
            .single()
        ]);
        
        if (templateResult.error) throw templateResult.error;
        const templateData = templateResult.data;
        const userSettings = userSettingsResult.data;

        // Process template content with contact data for placeholders if not already provided
        let processedContent = formData.content;
        if (!processedContent && templateData) {
          processedContent = processTemplateVariables(templateData.conteudo, contatoData);
        }
        
        // Handle attachments more efficiently
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
        
        const signatureImage = formData.signature_image || userSettings?.signature_image || templateData.signature_image;
        
        // Prepare SMTP settings if configured
        const smtpSettings = userSettings?.use_smtp ? {
          host: userSettings.email_smtp,
          port: userSettings.email_porta,
          secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
          password: userSettings.email_senha,
          from_name: userSettings.smtp_nome || '',
          from_email: userSettings.email_usuario || ''
        } : null;
        
        // Update toast with processing status
        toast.loading(`Processando envio para ${contatoNome || contatoEmail}...`, {
          id: loadingToastId
        });
        
        const emailSubject = formData.subject || templateData?.descricao || templateData?.nome || "Sem assunto";
        
        const dataToSend = {
          to: contatoEmail,
          attachments: parsedAttachments || null,
          contato_id: formData.contato_id,
          template_id: formData.template_id,
          agendamento_id: formData.agendamento_id,
          contato_nome: contatoNome,
          subject: emailSubject,
          content: processedContent,
          signature_image: signatureImage,
          image_url: templateData?.image_url,
          smtp_settings: smtpSettings
        };
        
        console.log("Sending email with data:", { 
          to: contatoEmail,
          template_id: formData.template_id,
          contato_id: formData.contato_id,
          has_attachments: !!parsedAttachments,
          has_image: !!templateData?.image_url,
          subject: emailSubject,
          content_length: processedContent?.length,
          signature_image: !!signatureImage,
          use_smtp: !!userSettings?.use_smtp
        });
        
        const response = await supabase.functions.invoke('send-email', {
          body: dataToSend
        });
        
        if (response.error) {
          console.error("Edge function error:", response.error);
          throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
        }
        
        const responseData = response.data;
        if (!responseData || !responseData.success) {
          console.error("Failed response from send-email:", responseData);
          throw new Error(responseData?.error || "Falha ao enviar email");
        }
        
        console.log('Email enviado com sucesso:', responseData);
        
        toast.dismiss(loadingToastId);
        toast.success(`Email enviado com sucesso para ${contatoNome || contatoEmail}!`);
        
        // Create entry in envios table
        if (formData.contato_id && formData.template_id) {
          try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Usuário não autenticado');
            
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
          } catch (err) {
            console.error("Error saving to envios table:", err);
          }
        }
        
        await fetchEnvios();
        return true;
        
      } catch (err: any) {
        console.error('Erro ao enviar email:', err);
        toast.dismiss(loadingToastId);
        toast.error(`Erro ao enviar email: ${err.message || 'Verifique suas configurações de email'}`);
        return false;
      }
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
      
      // Show resending toast
      const loadingToastId = toast.loading(`Reenviando email para ${envio.contato.nome}...`);
      
      // Get template data to include attachments
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', envio.template_id)
        .single();
        
      if (templateError) throw templateError;
      
      // Get user settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_seguranca, smtp_nome, use_smtp')
        .single();
      
      // Update toast with processing status
      toast.loading(`Processando reenvio para ${envio.contato.nome}...`, {
        id: loadingToastId
      });

      // Parse attachments for proper handling
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
        // Always use template description as subject if available, otherwise use template name
        subject: templateData.descricao || templateData.nome
      });
      
      toast.dismiss(loadingToastId);
      
      // Atualizar status do envio original
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

  // Fetch envios when the component mounts
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
    resendEnvio,
    processTemplateVariables
  };
}

export default useEnvios;
