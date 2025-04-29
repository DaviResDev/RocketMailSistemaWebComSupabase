
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
  const [sending, setSending] = useState(false);
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

    if (!formData.contato_id || !formData.template_id) {
      toast.error('Selecione um contato e um template para enviar a mensagem');
      return false;
    }

    setSending(true);

    try {
      console.log('Enviando mensagem com os dados:', formData);
      
      // Verificar se o contato existe
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('id, nome, email')
        .eq('id', formData.contato_id)
        .single();
      
      if (contatoError) {
        console.error('Erro ao verificar contato:', contatoError);
        throw new Error('Contato não encontrado. Verifique se ele existe.');
      }
      
      // Verificar se o template existe
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('id, nome')
        .eq('id', formData.template_id)
        .single();
      
      if (templateError) {
        console.error('Erro ao verificar template:', templateError);
        throw new Error('Template não encontrado. Verifique se ele existe.');
      }
      
      console.log('Contato e template verificados com sucesso');

      // Criar o registro de envio
      const { data, error } = await supabase
        .from('envios')
        .insert([{
          ...formData,
          user_id: user.id,
          status: 'pendente',
          data_envio: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Erro ao inserir envio no banco de dados:', error);
        throw error;
      }
      
      console.log('Envio registrado com sucesso:', data);
      toast.success(`Mensagem "${template.nome}" enviada para ${contato.nome}!`);
      await fetchEnvios();
      return true;
    } catch (error: any) {
      console.error('Erro completo ao enviar mensagem:', error);
      toast.error(`Falha ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    envios,
    loading,
    sending,
    fetchEnvios,
    createEnvio
  };
}
