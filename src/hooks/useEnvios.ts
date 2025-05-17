
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types
interface EnvioFormData {
  contato_id: string;
  template_id: string;
  agendamento_id?: string;
  attachments?: any;
  subject?: string;
  content?: string;
  signature_image?: string;
  contato_nome?: string;
  contato_email?: string;
}

interface Envio {
  id: string;
  status: string;
  data_envio: string;
  contato?: {
    nome: string;
    email: string;
  };
  template?: {
    nome: string;
    canal?: string;
    descricao?: string;
  };
  erro?: string;
  attachments?: any[];
}

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

  const sendEmail = async (formData: EnvioFormData) => {
    setSending(true);
    
    try {
      // Get contato data for better feedback
      const { data: contatoData, error: contatoError } = await supabase
        .from('contatos')
        .select('nome, email')
        .eq('id', formData.contato_id)
        .single();
      
      if (contatoError) {
        toast.error(`Não foi possível encontrar o contato: ${contatoError.message}`);
        setSending(false);
        return false;
      }
      
      // Show initial progress toast
      const loadingToastId = toast.loading(`Iniciando envio para ${contatoData.nome}...`);
      
      try {
        // Get template data to include attachments and for content processing
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', formData.template_id)
          .single();
          
        if (templateError) throw templateError;

        // Get user settings to include signature
        const { data: userSettings } = await supabase
          .from('configuracoes')
          .select('signature_image, email_usuario, smtp_nome, use_smtp')
          .single();

        // Process template content with contact data for placeholders if not already provided
        let processedContent = formData.content;
        if (!processedContent) {
          const currentDate = new Date();
          const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
          
          processedContent = templateData.conteudo
            .replace(/{nome}/g, contatoData.nome || '')
            .replace(/{email}/g, contatoData.email || '')
            .replace(/{telefone}/g, "")
            .replace(/{razao_social}/g, "")
            .replace(/{cliente}/g, "")
            .replace(/{dia}/g, formattedDate);
        }
        
        // Handle attachments more carefully
        let attachmentsToSend = formData.attachments;
        if (!attachmentsToSend && templateData.attachments) {
          // Log detailed info about template attachments for debugging
          console.log("Template attachments data:", {
            type: typeof templateData.attachments,
            isArray: Array.isArray(templateData.attachments),
            value: templateData.attachments
          });
          
          attachmentsToSend = templateData.attachments;
        }
        
        // Use signature from user settings or template
        const signatureImage = userSettings?.signature_image || templateData.signature_image;
        
        // Construct the final email body with image at top, content in middle, and signature at bottom
        let finalContent = '';
        
        // Add image if present
        if (templateData.image_url) {
          finalContent += `<div style="margin-bottom: 20px;"><img src="${templateData.image_url}" alt="Imagem do template" style="max-width: 100%; height: auto;" /></div>`;
        }
        
        // Add main content
        finalContent += processedContent;
        
        // Include attachments from the template if they exist
        const dataToSend = {
          ...formData,
          attachments: attachmentsToSend || null,
          contato_nome: contatoData.nome,
          contato_email: contatoData.email,
          // Always use template description as subject if available, otherwise use template name
          subject: formData.subject || templateData.descricao || templateData.nome,
          content: finalContent,
          signature_image: signatureImage,
          template_name: templateData.nome,
          // Include SMTP settings if using SMTP
          smtp_settings: userSettings?.use_smtp ? {
            from_name: userSettings.smtp_nome || '',
            from_email: userSettings.email_usuario || ''
          } : null,
          image_url: templateData.image_url
        };
        
        console.log("Sending email with data:", { 
          to: contatoData.email,
          template_id: formData.template_id,
          contato_id: formData.contato_id,
          has_attachments: !!attachmentsToSend,
          has_image: !!templateData.image_url,
          subject: dataToSend.subject,
          content_length: dataToSend.content?.length,
          signature_image: !!dataToSend.signature_image,
          use_smtp: !!userSettings?.use_smtp
        });
        
        // Update toast with processing status
        toast.loading(`Processando envio para ${contatoData.nome}...`, {
          id: loadingToastId
        });
        
        const response = await supabase.functions.invoke('send-email', {
          body: dataToSend
        });
        
        // Check function response
        if (response.error) {
          throw new Error(`Erro na função de envio: ${response.error.message}`);
        }
        
        // Check data response
        const responseData = response.data;
        if (!responseData || !responseData.success) {
          throw new Error(responseData?.error || "Falha ao enviar email");
        }
        
        // Success case
        console.log('Email enviado com sucesso:', responseData);
        
        toast.dismiss(loadingToastId);
        toast.success(`Email enviado com sucesso para ${contatoData.nome}!`);
        
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
          contato:contato_id(nome, email)
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
        .select('signature_image')
        .single();
      
      // Update toast with processing status
      toast.loading(`Processando reenvio para ${envio.contato.nome}...`, {
        id: loadingToastId
      });

      // Handle attachments
      let attachmentsToSend = null;
      if (templateData.attachments) {
        if (typeof templateData.attachments === 'string' && templateData.attachments !== '[]') {
          try {
            attachmentsToSend = JSON.parse(templateData.attachments);
          } catch (err) {
            console.error('Erro ao analisar anexos:', err);
            attachmentsToSend = templateData.attachments;
          }
        } else {
          attachmentsToSend = templateData.attachments;
        }
      }
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id,
        attachments: attachmentsToSend,
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
    resendEnvio
  };
}

export default useEnvios;
