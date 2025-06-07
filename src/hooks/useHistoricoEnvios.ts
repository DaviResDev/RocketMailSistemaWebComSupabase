
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
  status: 'pendente' | 'enviado' | 'erro' | 'cancelado' | 'agendado';
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
  status: 'pendente' | 'enviado' | 'erro' | 'cancelado' | 'agendado';
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
      
      const typedData = (data || []) as HistoricoEnvio[];
      console.log(`📊 Histórico carregado: ${typedData.length} registros`);
      setHistorico(typedData);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de envios');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createHistoricoEnvio = useCallback(async (data: CreateHistoricoEnvio) => {
    if (!user) {
      console.error('❌ Usuário não autenticado para criar histórico');
      return;
    }

    try {
      // CORREÇÃO: Validação rigorosa de campos obrigatórios
      const validStatus = ['pendente', 'enviado', 'erro', 'cancelado', 'agendado'].includes(data.status) 
        ? data.status 
        : 'enviado';
      
      const validTipoEnvio = ['imediato', 'agendado'].includes(data.tipo_envio)
        ? data.tipo_envio
        : 'imediato';
      
      // Verificar campos obrigatórios
      if (!data.remetente_nome || !data.remetente_email || !data.destinatario_nome || !data.destinatario_email) {
        console.error('❌ Campos obrigatórios ausentes:', data);
        return;
      }
      
      const { error } = await supabase
        .from('envios_historico')
        .insert([{
          ...data,
          status: validStatus,
          tipo_envio: validTipoEnvio,
          user_id: user.id
        }]);

      if (error) throw error;
      
      console.log(`✅ Registro criado no histórico: ${data.destinatario_email} - ${validStatus}`);
      await fetchHistorico();
    } catch (error: any) {
      console.error('Erro ao criar registro no histórico:', error);
    }
  }, [user, fetchHistorico]);

  const createBatchHistorico = useCallback(async (records: CreateHistoricoEnvio[]) => {
    if (!user || records.length === 0) {
      console.error('❌ Usuário não autenticado ou records vazios');
      return;
    }

    try {
      // CORREÇÃO: Validação rigorosa para cada record
      const recordsWithUserId = records
        .filter(record => {
          // Filtrar records com campos obrigatórios
          return record.remetente_nome && record.remetente_email && 
                 record.destinatario_nome && record.destinatario_email;
        })
        .map(record => {
          const validStatus = ['pendente', 'enviado', 'erro', 'cancelado', 'agendado'].includes(record.status) 
            ? record.status 
            : 'enviado';
          
          const validTipoEnvio = ['imediato', 'agendado'].includes(record.tipo_envio)
            ? record.tipo_envio
            : 'imediato';
          
          return {
            ...record,
            status: validStatus,
            tipo_envio: validTipoEnvio,
            user_id: user.id
          };
        });

      if (recordsWithUserId.length === 0) {
        console.error('❌ Nenhum record válido para inserir');
        return;
      }

      const { error } = await supabase
        .from('envios_historico')
        .insert(recordsWithUserId);

      if (error) throw error;
      
      console.log(`📝 ${recordsWithUserId.length} registros em lote salvos no histórico`);
      await fetchHistorico();
    } catch (error: any) {
      console.error('Erro ao criar registros em lote no histórico:', error);
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
