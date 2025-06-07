
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeTipoEnvio } from '@/types/envios';

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
  tipo_envio: string;
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
  tipo_envio: string;
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

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Configurando atualizações em tempo real para histórico');

    const channel = supabase
      .channel('envios-historico-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'envios_historico',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Atualização em tempo real recebida:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              const newRecord = payload.new as HistoricoEnvio;
              setHistorico(prev => [newRecord, ...prev]);
              toast.success(`Email ${newRecord.status === 'enviado' ? 'enviado' : 'processado'} para ${newRecord.destinatario_email}`);
              break;
              
            case 'UPDATE':
              const updatedRecord = payload.new as HistoricoEnvio;
              setHistorico(prev => prev.map(item => 
                item.id === updatedRecord.id ? updatedRecord : item
              ));
              break;
              
            case 'DELETE':
              const deletedId = payload.old.id;
              setHistorico(prev => prev.filter(item => item.id !== deletedId));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando canal de tempo real');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createHistoricoEnvio = useCallback(async (data: CreateHistoricoEnvio) => {
    if (!user) {
      console.error('❌ Usuário não autenticado para criar histórico');
      return;
    }

    try {
      const validStatus = ['pendente', 'enviado', 'erro', 'cancelado', 'agendado'].includes(data.status) 
        ? data.status 
        : 'enviado';
      
      const normalizedTipoEnvio = normalizeTipoEnvio(data.tipo_envio || 'individual');
      
      if (!data.remetente_nome || !data.remetente_email || !data.destinatario_nome || !data.destinatario_email) {
        console.error('❌ Campos obrigatórios ausentes:', data);
        return;
      }
      
      const { error } = await supabase
        .from('envios_historico')
        .insert([{
          ...data,
          status: validStatus,
          tipo_envio: normalizedTipoEnvio,
          user_id: user.id
        }]);

      if (error) throw error;
      
      console.log(`✅ Registro criado no histórico: ${data.destinatario_email} - ${validStatus} - ${normalizedTipoEnvio}`);
    } catch (error: any) {
      console.error('Erro ao criar registro no histórico:', error);
    }
  }, [user]);

  const createBatchHistorico = useCallback(async (records: CreateHistoricoEnvio[]) => {
    if (!user || records.length === 0) {
      console.error('❌ Usuário não autenticado ou records vazios');
      return;
    }

    try {
      const recordsWithUserId = records
        .filter(record => {
          return record.remetente_nome && record.remetente_email && 
                 record.destinatario_nome && record.destinatario_email;
        })
        .map(record => {
          const validStatus = ['pendente', 'enviado', 'erro', 'cancelado', 'agendado'].includes(record.status) 
            ? record.status 
            : 'enviado';
          
          const normalizedTipoEnvio = normalizeTipoEnvio(record.tipo_envio || 'individual');
          
          return {
            ...record,
            status: validStatus,
            tipo_envio: normalizedTipoEnvio,
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
    } catch (error: any) {
      console.error('Erro ao criar registros em lote no histórico:', error);
    }
  }, [user]);

  return {
    historico,
    loading,
    fetchHistorico,
    createHistoricoEnvio,
    createBatchHistorico
  };
}
