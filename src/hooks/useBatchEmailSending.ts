
import { useState } from 'react';
import { toast } from 'sonner';
import { processBatch, getBatchSummary, BatchResult } from '@/utils/batchProcessing';
import useEnvios from './useEnvios';

interface EmailJob {
  contactId: string;
  templateId: string;
  contactName?: string;
}

export function useBatchEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendEmail } = useEnvios();

  const sendBatchEmails = async (
    jobs: EmailJob[],
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      showProgress?: boolean;
    } = {}
  ) => {
    if (jobs.length === 0) {
      toast.error("Nenhum email para enviar");
      return { success: false, results: [] };
    }

    setIsProcessing(true);
    
    try {
      const {
        batchSize = 3,
        delayBetweenBatches = 500,
        showProgress = true
      } = options;

      if (showProgress) {
        toast.info(`Iniciando envio em lote para ${jobs.length} contatos...`);
      }

      const results = await processBatch(
        jobs,
        async (job) => {
          return await sendEmail({
            contato_id: job.contactId,
            template_id: job.templateId,
            contato_nome: job.contactName
          });
        },
        {
          batchSize,
          delayBetweenBatches,
          showProgress
        }
      );

      const summary = getBatchSummary(results);

      // Show final result
      if (summary.successCount === summary.total) {
        toast.success(
          `Todos os ${summary.total} emails foram enviados com sucesso!`
        );
      } else if (summary.successCount > 0) {
        toast.warning(
          `${summary.successCount} de ${summary.total} emails foram enviados com sucesso.`
        );
      } else {
        toast.error("Falha ao enviar emails");
      }

      return {
        success: summary.successCount > 0,
        results,
        summary
      };
    } catch (error: any) {
      console.error("Erro durante envio em lote:", error);
      toast.error(`Erro durante envio em lote: ${error.message}`);
      return {
        success: false,
        results: [],
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendBatchEmails,
    isProcessing
  };
}
