
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types
interface EnvioFormData {
  contato_id: string;
  template_id: string;
  agendamento_id?: string;
  attachments?: any;
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
        // Get template data to include attachments
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', formData.template_id)
          .single();
          
        if (templateError) throw templateError;
        
        // Include attachments from the template if they exist
        const dataToSend = {
          ...formData,
          attachments: templateData.attachments || null,
          contato_nome: contatoData.nome,
          contato_email: contatoData.email
        };
        
        console.log("Sending email with data:", { 
          to: contatoData.email,
          template_id: formData.template_id,
          contato_id: formData.contato_id,
          has_attachments: !!templateData.attachments
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
        if (!responseData.success) {
          throw new Error(responseData.error || "Falha ao enviar email");
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
      
      // Update toast with processing status
      toast.loading(`Processando reenvio para ${envio.contato.nome}...`, {
        id: loadingToastId
      });
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id,
        // Include attachments from the template
        attachments: templateData.attachments || null
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
