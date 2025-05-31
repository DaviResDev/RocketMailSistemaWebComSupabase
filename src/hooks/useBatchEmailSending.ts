
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

  // Parallel email sending with simultaneous processing
  const sendParallelEmails = async (jobs: EmailJob[]): Promise<BatchResult<any>[]> => {
    console.log(`🚀 Starting parallel email sending for ${jobs.length} emails`);
    
    // Create all email promises simultaneously
    const emailPromises = jobs.map(async (job, index) => {
      try {
        const result = await sendEmail({
          contato_id: job.contactId,
          template_id: job.templateId,
          contato_nome: job.contactName
        });
        
        // Update progress atomically
        setProgress(prev => ({ current: prev.current + 1, total: prev.total }));
        
        return {
          success: true,
          result,
          index,
          id: job.contactId
        } as BatchResult<any>;
      } catch (error: any) {
        // Update progress atomically for errors too
        setProgress(prev => ({ current: prev.current + 1, total: prev.total }));
        
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          index,
          id: job.contactId
        } as BatchResult<any>;
      }
    });

    // Execute all emails simultaneously
    const results = await Promise.all(emailPromises);
    console.log(`✅ Parallel processing completed: ${results.length} emails processed`);
    
    return results;
  };

  const sendBatchEmails = async (
    jobs: EmailJob[],
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      showProgress?: boolean;
      enableOptimizations?: boolean;
      useParallelSending?: boolean;
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
        showProgress = true,
        useParallelSending = true // Enable parallel sending by default
      } = options;

      const startTime = Date.now();

      if (showProgress) {
        if (useParallelSending && jobs.length >= 50) {
          toast.info(`🚀 Enviando ${jobs.length} emails simultaneamente...`);
        } else if (jobs.length >= 500) {
          toast.info(`🚀 Modo ultra-otimizado ativado para ${jobs.length} contatos`);
        } else {
          toast.info(`Iniciando envio para ${jobs.length} contatos...`);
        }
      }

      let results: BatchResult<any>[];
      let toastId: string | number | undefined;
      
      if (useParallelSending && jobs.length <= 2000) {
        // Use parallel sending for simultaneous processing
        if (showProgress) {
          toastId = toast.loading(
            `📧 Processando ${jobs.length} emails simultaneamente...`,
            { duration: Infinity }
          );
        }
        
        results = await sendParallelEmails(jobs);
      } else {
        // Fallback to optimized batch processing for very large volumes
        const optimalBatchSize = jobs.length >= 1000 ? 150 : jobs.length >= 500 ? 100 : 50;
        const optimalDelay = jobs.length >= 1000 ? 25 : jobs.length >= 500 ? 50 : 100;

        if (showProgress) {
          toastId = toast.loading(
            `📧 Processando ${jobs.length} emails em lotes otimizados...`,
            { duration: Infinity }
          );
        }

        results = await processBatch(
          jobs,
          async (job, index) => {
            const result = await sendEmail({
              contato_id: job.contactId,
              template_id: job.templateId,
              contato_nome: job.contactName
            });
            
            setProgress({ current: index + 1, total: jobs.length });
            return result;
          },
          {
            batchSize: optimalBatchSize,
            delayBetweenBatches: optimalDelay,
            showProgress: false,
            enableLargeVolumeOptimizations: jobs.length >= 500
          }
        );
      }

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      const summary = getBatchSummary(results);
      const processingTime = Date.now() - startTime;
      const avgTimePerEmail = processingTime / jobs.length;

      // Enhanced success/error alerts with detailed feedback
      if (summary.successCount === summary.total) {
        const throughput = Math.round((jobs.length / processingTime) * 1000);
        const alertMessage = useParallelSending 
          ? `✅ Todos os ${summary.total} emails enviados simultaneamente! (${throughput} emails/s)`
          : `✅ Todos os ${summary.total} emails enviados com sucesso! (${Math.round(avgTimePerEmail)}ms/email médio)`;
        
        // Create dismissible success alert
        const successToastId = toast.success(alertMessage, {
          duration: 10000,
          action: {
            label: "✕",
            onClick: () => toast.dismiss(successToastId)
          }
        });
      } else if (summary.successCount > 0) {
        const alertMessage = `⚠️ ${summary.successCount} de ${summary.total} emails enviados (${summary.successRate}% sucesso). ${summary.errorCount} falharam.`;
        
        // Create dismissible warning alert
        const warningToastId = toast.warning(alertMessage, {
          duration: 15000,
          action: {
            label: "✕",
            onClick: () => toast.dismiss(warningToastId)
          }
        });
      } else {
        // Create dismissible error alert
        const errorToastId = toast.error("❌ Falha ao enviar emails - Verifique as configurações", {
          duration: 15000,
          action: {
            label: "✕",
            onClick: () => toast.dismiss(errorToastId)
          }
        });
      }

      return {
        success: summary.successCount > 0,
        results,
        summary,
        processingTime,
        avgTimePerEmail: Math.round(avgTimePerEmail),
        throughput: Math.round((jobs.length / processingTime) * 1000),
        parallelProcessing: useParallelSending && jobs.length <= 2000
      };
    } catch (error: any) {
      console.error("Erro durante envio em lote:", error);
      
      // Create dismissible error alert
      const errorToastId = toast.error(`Erro durante envio em lote: ${error.message}`, {
        duration: 15000,
        action: {
          label: "✕",
          onClick: () => toast.dismiss(errorToastId)
        }
      });
      
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
