
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
  processingTime: string;
  throughput: string;
  parallelProcessing: boolean;
  timestamp: string;
  errors?: string[];
}

interface ProcessingOptions {
  useParallelProcessing?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
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

  const triggerManualProcessing = useCallback(async (options: ProcessingOptions = {}) => {
    try {
      setProcessing(true);
      
      const processingOptions = {
        useParallelProcessing: true,
        batchSize: 20,
        delayBetweenBatches: 50,
        triggered_by: 'manual',
        ...options
      };

      if (processingOptions.useParallelProcessing) {
        toast.info(`🚀 Iniciando processamento paralelo de agendamentos (${processingOptions.batchSize} por lote)...`);
      } else {
        toast.info('⏳ Iniciando processamento sequencial de agendamentos...');
      }

      const { data, error } = await supabase.functions.invoke('process-scheduled-emails', {
        body: processingOptions
      });

      if (error) throw error;

      const result = data as ProcessingResult;
      
      if (result.successful > 0) {
        toast.success(`✅ ${result.successful} emails enviados com sucesso! (${result.throughput})`);
      }
      
      if (result.failed > 0) {
        toast.warning(`⚠️ ${result.failed} emails falharam no envio`);
      }
      
      if (result.processed === 0) {
        toast.info('📭 Nenhum agendamento pendente encontrado');
      }

      // Show processing details
      if (result.processed > 0) {
        console.log(`📊 Processamento concluído:
          - Total: ${result.processed}
          - Sucessos: ${result.successful}
          - Falhas: ${result.failed}
          - Tempo: ${result.processingTime}
          - Throughput: ${result.throughput}
          - Modo paralelo: ${result.parallelProcessing ? 'SIM' : 'NÃO'}
        `);
      }

      // Refresh stats after processing
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

  const triggerParallelProcessing = useCallback(async () => {
    return await triggerManualProcessing({
      useParallelProcessing: true,
      batchSize: 30,
      delayBetweenBatches: 25
    });
  }, [triggerManualProcessing]);

  const triggerSequentialProcessing = useCallback(async () => {
    return await triggerManualProcessing({
      useParallelProcessing: false,
      batchSize: 1,
      delayBetweenBatches: 100
    });
  }, [triggerManualProcessing]);

  const retryFailedSchedules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get count of failed schedules first
      const { data: failedData, error: countError } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('status', 'erro');

      if (countError) throw countError;

      const failedCount = failedData?.length || 0;

      if (failedCount === 0) {
        toast.info('📭 Nenhum agendamento com erro encontrado');
        return;
      }

      // Mark failed schedules as pending again
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'pendente' })
        .eq('status', 'erro');

      if (error) throw error;

      toast.success(`🔄 ${failedCount} agendamentos marcados para reenvio`);
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
    triggerParallelProcessing,
    triggerSequentialProcessing,
    retryFailedSchedules
  };
}
