
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface EnvioEmailLog {
  id: string;
  template_id?: string;
  contato_id?: string;
  agendamento_id?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  assunto?: string;
  data_hora_envio: string;
  status: 'sucesso' | 'falha' | 'pendente';
  resposta_servidor?: any;
  mensagem_erro?: string;
  smtp_utilizado_id?: string;
  tipo_operacao: 'individual' | 'lote' | 'agendado';
  duracao_envio_ms?: number;
  created_at: string;
}

interface RegistrarEnvioParams {
  template_id?: string;
  contato_id?: string;
  agendamento_id?: string;
  destinatario_email: string;
  destinatario_nome?: string;
  assunto?: string;
  status: 'sucesso' | 'falha' | 'pendente';
  resposta_servidor?: any;
  mensagem_erro?: string;
  smtp_utilizado_id?: string;
  tipo_operacao: 'individual' | 'lote' | 'agendado';
  duracao_envio_ms?: number;
}

export function useEnviosEmailLogs() {
  const [logs, setLogs] = useState<EnvioEmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchLogs = useCallback(async (limite = 100) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('envios_email')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora_envio', { ascending: false })
        .limit(limite);

      if (error) throw error;
      
      // Transform data to ensure proper types
      const formattedLogs: EnvioEmailLog[] = data?.map(log => ({
        ...log,
        status: log.status as 'sucesso' | 'falha' | 'pendente',
        tipo_operacao: log.tipo_operacao as 'individual' | 'lote' | 'agendado'
      })) || [];
      
      setLogs(formattedLogs);
    } catch (error: any) {
      console.error('Erro ao carregar logs de envio:', error);
      toast.error('Erro ao carregar histórico de envios');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const registrarEnvio = async (params: RegistrarEnvioParams): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('envios_email')
        .insert({
          user_id: user.id,
          ...params
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log('📝 Log de envio registrado:', {
        email: params.destinatario_email,
        status: params.status,
        tipo: params.tipo_operacao
      });

      return data.id;
    } catch (error: any) {
      console.error('Erro ao registrar envio:', error);
      return null;
    }
  };

  const atualizarStatusEnvio = async (
    logId: string, 
    status: 'sucesso' | 'falha', 
    respostaServidor?: any,
    mensagemErro?: string,
    duracaoMs?: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('envios_email')
        .update({
          status,
          resposta_servidor: respostaServidor,
          mensagem_erro: mensagemErro,
          duracao_envio_ms: duracaoMs
        })
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar status do envio:', error);
      return false;
    }
  };

  const obterEstatisticas = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('envios_email')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const stats = {
        total: data.length,
        sucesso: data.filter(item => item.status === 'sucesso').length,
        falha: data.filter(item => item.status === 'falha').length,
        pendente: data.filter(item => item.status === 'pendente').length
      };

      return {
        ...stats,
        taxaSucesso: stats.total > 0 ? (stats.sucesso / stats.total * 100).toFixed(1) : '0'
      };
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }, [user]);

  return {
    logs,
    loading,
    fetchLogs,
    registrarEnvio,
    atualizarStatusEnvio,
    obterEstatisticas
  };
}
