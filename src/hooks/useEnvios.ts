
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Envio = {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  erro: string | null;
  user_id: string;
  contato?: {
    nome: string;
    email: string;
    telefone: string | null;
  };
  template?: {
    nome: string;
    canal: string;
  };
};

export type EnvioFormData = {
  contato_id: string;
  template_id: string;
};

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEnvios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos(nome, email, telefone),
          template:templates(nome, canal)
        `)
        .eq('user_id', user.id)
        .order('data_envio', { ascending: false });

      if (error) throw error;
      setEnvios(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de envios:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEnvio = async (formData: EnvioFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar mensagens');
      return false;
    }

    try {
      const { error } = await supabase
        .from('envios')
        .insert([{
          ...formData,
          user_id: user.id,
          status: 'pendente',
          data_envio: new Date().toISOString()
        }]);

      if (error) throw error;
      toast.success('Mensagem enviada para processamento!');
      await fetchEnvios();
      return true;
    } catch (error: any) {
      toast.error('Erro ao enviar mensagem: ' + error.message);
      return false;
    }
  };

  return {
    envios,
    loading,
    fetchEnvios,
    createEnvio
  };
}
