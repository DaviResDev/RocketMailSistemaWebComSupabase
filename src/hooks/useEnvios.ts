
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  return {
    envios,
    loading,
    fetchEnvios
  };
}
