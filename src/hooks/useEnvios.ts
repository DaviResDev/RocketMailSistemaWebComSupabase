
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

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
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contato_id(*),
          template:template_id(*)
        `)
        .eq('user_id', user.user.id)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      
      setEnvios(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de envios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (formData: EnvioFormData) => {
    setSending(true);
    
    // Get contato data for better feedback
    const { data: contatoData, error: contatoError } = await supabase
      .from('contatos')
      .select('nome, email')
      .eq('id', formData.contato_id)
      .single();
    
    if (contatoError) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não foi possível encontrar o contato: ${contatoError.message}`
      });
      setSending(false);
      return false;
    }
    
    // Show initial progress toast
    const sendingToastId = toast({
      title: "Enviando email",
      description: `Enviando email para ${contatoData.nome} (${contatoData.email})...`,
      duration: 60000 // Long duration, will be dismissed on completion
    });
    
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
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
        body: dataToSend
      });
      
      if (functionError) throw functionError;
      if (!functionData.success) throw new Error(functionData.error || "Falha ao enviar email");
      
      // Success case
      console.log('Email enviado com sucesso:', functionData);
      
      // Dismiss the sending toast
      toast.dismiss(sendingToastId);
      
      toast({
        title: "Sucesso",
        description: `Email enviado com sucesso para ${contatoData.nome}!`,
        duration: 5000
      });
      
      setSending(false);
      fetchEnvios();
      return true;
      
    } catch (err: any) {
      console.error('Erro ao enviar email:', err);
      
      // Dismiss the sending toast
      toast.dismiss(sendingToastId);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao enviar email: ${err.message || 'Verifique suas configurações de email'}`
      });
      
      setSending(false);
      return false;
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
      const resendingToastId = toast({
        title: "Reenviando email",
        description: `Reenviando email para ${envio.contato.nome}...`,
        duration: 60000
      });
      
      // Get template data to include attachments
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', envio.template_id)
        .single();
        
      if (templateError) throw templateError;
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id,
        // Include attachments from the template
        attachments: templateData.attachments || null
      });
      
      // Dismiss the resending toast
      toast.dismiss(resendingToastId);
      
      // Atualizar status do envio original
      if (result) {
        await supabase
          .from('envios')
          .update({ status: 'reenviado' })
          .eq('id', id);
      }
      
      return result;
    } catch (err: any) {
      console.error('Erro ao reenviar email:', err);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao reenviar email: ${err.message}`
      });
      
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
