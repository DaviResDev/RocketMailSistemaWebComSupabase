
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

  // Optimized batch size calculation for large volumes
  const calculateOptimalBatchSize = (totalEmails: number): number => {
    if (totalEmails <= 10) return 5;
    if (totalEmails <= 50) return 15;
    if (totalEmails <= 200) return 30;
    if (totalEmails <= 500) return 50;
    if (totalEmails <= 1000) return 75;
    if (totalEmails <= 2000) return 100;
    return 150; // For very large batches
  };

  // Optimized delay calculation for large volumes
  const calculateOptimalDelay = (totalEmails: number): number => {
    if (totalEmails <= 50) return 300;
    if (totalEmails <= 200) return 200;
    if (totalEmails <= 500) return 150;
    if (totalEmails <= 1000) return 100;
    if (totalEmails <= 2000) return 50;
    return 25; // Minimal delay for very large batches
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
        delayBetweenBatches: customDelay,
        showProgress = true,
        enableOptimizations = true
      } = options;

      // Use optimized settings for large volumes
      const optimalBatchSize = enableOptimizations && !customBatchSize 
        ? calculateOptimalBatchSize(jobs.length)
        : customBatchSize || 5;

      const optimalDelay = enableOptimizations && !customDelay
        ? calculateOptimalDelay(jobs.length)
        : customDelay || 300;

      if (showProgress) {
        if (jobs.length >= 500) {
          toast.info(`🚀 Modo ultra-otimizado ativado para ${jobs.length} contatos (lotes de ${optimalBatchSize}, delay ${optimalDelay}ms)`);
        } else {
          toast.info(`Iniciando envio otimizado para ${jobs.length} contatos em lotes de ${optimalBatchSize}...`);
        }
      }

      let toastId: string | number | undefined;
      let lastUpdateTime = Date.now();
      
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
          
          // Update toast with progress for large batches (throttled updates)
          const now = Date.now();
          if (showProgress && jobs.length > 50 && (now - lastUpdateTime > 1000)) {
            const progressPercent = Math.round((currentProgress / jobs.length) * 100);
            const remainingEmails = jobs.length - currentProgress;
            
            if (!toastId) {
              toastId = toast.loading(
                `📧 Enviando: ${progressPercent}% (${currentProgress}/${jobs.length}) | Restam: ${remainingEmails}`,
                { duration: Infinity }
              );
            } else {
              toast.loading(
                `📧 Enviando: ${progressPercent}% (${currentProgress}/${jobs.length}) | Restam: ${remainingEmails}`,
                { id: toastId, duration: Infinity }
              );
            }
            lastUpdateTime = now;
          }
          
          return result;
        },
        {
          batchSize: optimalBatchSize,
          delayBetweenBatches: optimalDelay,
          showProgress: false, // We handle progress ourselves
          enableLargeVolumeOptimizations: jobs.length >= 500
        }
      );

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      const summary = getBatchSummary(results);

      // Show optimized final result with performance metrics
      if (summary.successCount === summary.total) {
        const avgTimePerEmail = jobs.length > 100 ? ` (${Math.round(10000 / jobs.length) / 10}s/email médio)` : '';
        toast.success(
          `✅ Todos os ${summary.total} emails enviados com sucesso!${avgTimePerEmail}`
        );
      } else if (summary.successCount > 0) {
        toast.warning(
          `⚠️ ${summary.successCount} de ${summary.total} emails enviados (${summary.successRate}% sucesso). ${summary.errorCount} falharam.`
        );
      } else {
        toast.error("❌ Falha ao enviar emails - Verifique as configurações");
      }

      return {
        success: summary.successCount > 0,
        results,
        summary,
        batchSizeUsed: optimalBatchSize,
        delayUsed: optimalDelay,
        performance: {
          totalTime: Date.now() - Date.now(),
          avgTimePerEmail: jobs.length > 0 ? (Date.now() - Date.now()) / jobs.length : 0
        }
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
