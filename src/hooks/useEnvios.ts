
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
    try {
      // Get contato data to use in success message
      const { data: contatoData, error: contatoError } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', formData.contato_id)
        .single();
      
      if (contatoError) throw contatoError;
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
        body: formData
      });
      
      if (functionError) throw functionError;
      
      // Success case
      console.log('Email enviado com sucesso:', functionData);
      
      toast({
        title: "Sucesso",
        description: `Email enviado com sucesso para ${contatoData.nome}! Um recebimento automático será enviado ao destinatário.`,
        duration: 5000
      });
      
      setSending(false);
      fetchEnvios();
      return true;
      
    } catch (err: any) {
      console.error('Erro ao enviar email:', err);
      
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
        .select('*')
        .eq('id', id)
        .single();
      
      if (envioError) throw envioError;
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id
      });
      
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
