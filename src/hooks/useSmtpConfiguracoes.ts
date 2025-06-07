
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SmtpConfiguracao {
  id: string;
  nome_configuracao: string;
  host: string;
  porta: number;
  email_origem: string;
  senha_criptografada: string;
  tipo_envio: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface SmtpConfiguracaoForm {
  nome_configuracao: string;
  host: string;
  porta: number;
  email_origem: string;
  senha: string;
  ativo: boolean;
}

export function useSmtpConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<SmtpConfiguracao[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchConfiguracoes = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smtp_configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfiguracoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações SMTP:', error);
      toast.error('Erro ao carregar configurações SMTP');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const salvarConfiguracao = async (dados: SmtpConfiguracaoForm): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      // Criptografar a senha usando a função do banco
      const { data: senhaHash, error: hashError } = await supabase
        .rpc('encrypt_smtp_password', { plain_password: dados.senha });

      if (hashError) throw hashError;

      const { error } = await supabase
        .from('smtp_configuracoes')
        .insert({
          user_id: user.id,
          nome_configuracao: dados.nome_configuracao,
          host: dados.host,
          porta: dados.porta,
          email_origem: dados.email_origem,
          senha_criptografada: senhaHash,
          tipo_envio: 'smtp_proprio',
          ativo: dados.ativo
        });

      if (error) throw error;

      toast.success('Configuração SMTP salva com sucesso!');
      await fetchConfiguracoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar configuração SMTP:', error);
      toast.error('Erro ao salvar configuração SMTP');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const ativarConfiguracao = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Desativar todas as outras configurações
      await supabase
        .from('smtp_configuracoes')
        .update({ ativo: false })
        .eq('user_id', user.id);

      // Ativar a configuração selecionada
      const { error } = await supabase
        .from('smtp_configuracoes')
        .update({ ativo: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Configuração SMTP ativada!');
      await fetchConfiguracoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao ativar configuração:', error);
      toast.error('Erro ao ativar configuração');
      return false;
    }
  };

  const excluirConfiguracao = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('smtp_configuracoes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Configuração SMTP excluída!');
      await fetchConfiguracoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir configuração:', error);
      toast.error('Erro ao excluir configuração');
      return false;
    }
  };

  return {
    configuracoes,
    loading,
    fetchConfiguracoes,
    salvarConfiguracao,
    ativarConfiguracao,
    excluirConfiguracao
  };
}
