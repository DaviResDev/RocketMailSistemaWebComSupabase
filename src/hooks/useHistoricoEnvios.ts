
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface HistoricoEnvio {
  id: string;
  user_id: string;
  template_id: string | null;
  contato_id: string | null;
  remetente_nome: string;
  remetente_email: string;
  destinatario_nome: string;
  destinatario_email: string;
  status: 'entregue' | 'falhou';
  template_nome: string | null;
  tipo_envio: 'imediato' | 'agendado';
  mensagem_erro: string | null;
  data_envio: string;
  created_at: string;
}

export interface CreateHistoricoEnvio {
  template_id?: string;
  contato_id?: string;
  remetente_nome: string;
  remetente_email: string;
  destinatario_nome: string;
  destinatario_email: string;
  status: 'entregue' | 'falhou';
  template_nome?: string;
  tipo_envio: 'imediato' | 'agendado';
  mensagem_erro?: string;
}

export function useHistoricoEnvios() {
  const [historico, setHistorico] = useState<HistoricoEnvio[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistorico = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('envios_historico')
        .select('*')
        .eq('user_id', user.id)
        .order('data_envio', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de envios');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createHistoricoEnvio = useCallback(async (data: CreateHistoricoEnvio) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('envios_historico')
        .insert([{
          ...data,
          user_id: user.id
        }]);

      if (error) throw error;
      
      // Refresh the list
      await fetchHistorico();
    } catch (error: any) {
      console.error('Erro ao criar registro no histórico:', error);
      // Don't show error toast here as this might be called in batch operations
    }
  }, [user, fetchHistorico]);

  const createBatchHistorico = useCallback(async (records: CreateHistoricoEnvio[]) => {
    if (!user || records.length === 0) return;

    try {
      const recordsWithUserId = records.map(record => ({
        ...record,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('envios_historico')
        .insert(recordsWithUserId);

      if (error) throw error;
      
      // Refresh the list
      await fetchHistorico();
    } catch (error: any) {
      console.error('Erro ao criar registros em lote no histórico:', error);
      // Don't show error toast here as this might be called in batch operations
    }
  }, [user, fetchHistorico]);

  return {
    historico,
    loading,
    fetchHistorico,
    createHistoricoEnvio,
    createBatchHistorico
  };
}
