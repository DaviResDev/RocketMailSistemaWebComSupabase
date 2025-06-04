
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduledEmailStats {
  total: number;
  pendente: number;
  enviado: number;
  erro: number;
}

interface ProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  timestamp: string;
  errors?: string[];
}

export function useScheduledEmailsMonitoring() {
  const [stats, setStats] = useState<ScheduledEmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('status');

      if (error) throw error;

      const stats: ScheduledEmailStats = {
        total: data.length,
        pendente: data.filter(item => item.status === 'pendente').length,
        enviado: data.filter(item => item.status === 'enviado').length,
        erro: data.filter(item => item.status === 'erro').length,
      };

      setStats(stats);
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas de agendamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerManualProcessing = useCallback(async () => {
    try {
      setProcessing(true);
      toast.info('Iniciando processamento manual de agendamentos...');

      const { data, error } = await supabase.functions.invoke('process-scheduled-emails', {
        body: { triggered_by: 'manual' }
      });

      if (error) throw error;

      const result = data as ProcessingResult;
      
      if (result.successful > 0) {
        toast.success(`✅ ${result.successful} emails enviados com sucesso!`);
      }
      
      if (result.failed > 0) {
        toast.warning(`⚠️ ${result.failed} emails falharam no envio`);
      }
      
      if (result.processed === 0) {
        toast.info('Nenhum agendamento pendente encontrado');
      }

      // Atualizar estatísticas
      await fetchStats();
      
      return result;
    } catch (error: any) {
      console.error('Erro no processamento manual:', error);
      toast.error(`Erro no processamento: ${error.message}`);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [fetchStats]);

  const retryFailedSchedules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Marcar agendamentos com erro como pendentes novamente
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'pendente' })
        .eq('status', 'erro');

      if (error) throw error;

      toast.success('Agendamentos com erro foram marcados para reenvio');
      await fetchStats();
    } catch (error: any) {
      console.error('Erro ao reprocessar agendamentos:', error);
      toast.error('Erro ao marcar agendamentos para reenvio');
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  return {
    stats,
    loading,
    processing,
    fetchStats,
    triggerManualProcessing,
    retryFailedSchedules
  };
}
