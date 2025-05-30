
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { sendEmail } = useEnvios();

  // Dynamic batch size calculation based on total emails
  const calculateOptimalBatchSize = (totalEmails: number): number => {
    if (totalEmails <= 10) return 3;
    if (totalEmails <= 50) return 10;
    if (totalEmails <= 200) return 25;
    if (totalEmails <= 500) return 50;
    return 100; // For very large batches
  };

  const sendBatchEmails = async (
    jobs: EmailJob[],
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      showProgress?: boolean;
      enableOptimizations?: boolean;
    } = {}
  ) => {
    if (jobs.length === 0) {
      toast.error("Nenhum email para enviar");
      return { success: false, results: [] };
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: jobs.length });
    
    try {
      const {
        batchSize: customBatchSize,
        delayBetweenBatches = 300, // Reduced delay for faster processing
        showProgress = true,
        enableOptimizations = true
      } = options;

      // Use dynamic batch size if optimizations are enabled and no custom size provided
      const optimalBatchSize = enableOptimizations && !customBatchSize 
        ? calculateOptimalBatchSize(jobs.length)
        : customBatchSize || 3;

      if (showProgress) {
        toast.info(`Iniciando envio otimizado para ${jobs.length} contatos em lotes de ${optimalBatchSize}...`);
      }

      let toastId: string | number | undefined;
      
      const results = await processBatch(
        jobs,
        async (job, index) => {
          const result = await sendEmail({
            contato_id: job.contactId,
            template_id: job.templateId,
            contato_nome: job.contactName
          });
          
          // Update progress
          const currentProgress = index + 1;
          setProgress({ current: currentProgress, total: jobs.length });
          
          // Update toast with progress for large batches
          if (showProgress && jobs.length > 20) {
            const progressPercent = Math.round((currentProgress / jobs.length) * 100);
            
            if (!toastId) {
              toastId = toast.loading(`Enviando emails: ${progressPercent}% (${currentProgress}/${jobs.length})`);
            } else {
              toast.loading(`Enviando emails: ${progressPercent}% (${currentProgress}/${jobs.length})`, {
                id: toastId
              });
            }
          }
          
          return result;
        },
        {
          batchSize: optimalBatchSize,
          delayBetweenBatches,
          showProgress: false // We handle progress ourselves
        }
      );

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      const summary = getBatchSummary(results);

      // Show optimized final result
      if (summary.successCount === summary.total) {
        toast.success(
          `✅ Todos os ${summary.total} emails enviados com sucesso! (Lotes de ${optimalBatchSize})`
        );
      } else if (summary.successCount > 0) {
        toast.warning(
          `⚠️ ${summary.successCount} de ${summary.total} emails enviados. ${summary.errorCount} falharam.`
        );
      } else {
        toast.error("❌ Falha ao enviar emails");
      }

      return {
        success: summary.successCount > 0,
        results,
        summary,
        batchSizeUsed: optimalBatchSize
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
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    sendBatchEmails,
    isProcessing,
    progress
  };
}
