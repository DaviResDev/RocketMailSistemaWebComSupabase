
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

  // Ultra-fast parallel email sending with optimized batch processing
  const sendUltraParallelEmails = async (jobs: EmailJob[]): Promise<BatchResult<any>[]> => {
    console.log(`🚀 Starting ultra-parallel email sending for ${jobs.length} emails`);
    
    // For ultra-large volumes (10k+), use chunked parallel processing
    const chunkSize = Math.min(1000, Math.max(100, Math.floor(jobs.length / 30))); // Dynamic chunk size
    const chunks = [];
    
    for (let i = 0; i < jobs.length; i += chunkSize) {
      chunks.push(jobs.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Processing ${jobs.length} emails in ${chunks.length} ultra-parallel chunks of ~${chunkSize} each`);
    
    const allResults: BatchResult<any>[] = [];
    let processedCount = 0;
    
    // Process all chunks simultaneously with Promise.all for maximum speed
    const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
      console.log(`⚡ Processing ultra-parallel chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} emails`);
      
      // Process all emails in this chunk simultaneously
      const emailPromises = chunk.map(async (job, index) => {
        try {
          const result = await sendEmail({
            contato_id: job.contactId,
            template_id: job.templateId,
            contato_nome: job.contactName
          });
          
          // Update progress atomically
          processedCount++;
          setProgress(prev => ({ current: processedCount, total: prev.total }));
          
          return {
            success: true,
            result,
            index: chunkIndex * chunkSize + index,
            id: job.contactId
          } as BatchResult<any>;
        } catch (error: any) {
          processedCount++;
          setProgress(prev => ({ current: processedCount, total: prev.total }));
          
          return {
            success: false,
            error: error.message || 'Erro desconhecido',
            index: chunkIndex * chunkSize + index,
            id: job.contactId
          } as BatchResult<any>;
        }
      });

      // Execute all emails in this chunk simultaneously
      return await Promise.all(emailPromises);
    });

    // Execute all chunks simultaneously for maximum throughput
    const chunkResults = await Promise.all(chunkPromises);
    
    // Flatten results from all chunks
    chunkResults.forEach(chunkResult => {
      allResults.push(...chunkResult);
    });
    
    console.log(`✅ Ultra-parallel processing completed: ${allResults.length} emails processed`);
    return allResults;
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
        useParallelSending = true
      } = options;

      const startTime = Date.now();

      if (showProgress) {
        if (jobs.length >= 10000) {
          toast.info(`🚀 Modo ultra-paralelo ativado para ${jobs.length.toLocaleString()} contatos - Envio simultâneo!`);
        } else if (jobs.length >= 1000) {
          toast.info(`⚡ Modo super-otimizado ativado para ${jobs.length.toLocaleString()} contatos`);
        } else if (jobs.length >= 50) {
          toast.info(`🚀 Enviando ${jobs.length} emails simultaneamente...`);
        } else {
          toast.info(`Iniciando envio para ${jobs.length} contatos...`);
        }
      }

      let results: BatchResult<any>[];
      let toastId: string | number | undefined;
      
      if (useParallelSending && jobs.length <= 30000) {
        // Use ultra-parallel sending for maximum speed
        if (showProgress) {
          const processingMessage = jobs.length >= 10000 
            ? `⚡ Processando ${jobs.length.toLocaleString()} emails em modo ultra-paralelo...`
            : `📧 Processando ${jobs.length.toLocaleString()} emails simultaneamente...`;
          
          toastId = toast.loading(processingMessage, { 
            duration: Infinity,
            action: {
              label: "✕",
              onClick: () => toast.dismiss(toastId)
            }
          });
        }
        
        results = await sendUltraParallelEmails(jobs);
      } else {
        // Fallback to optimized batch processing for very large volumes
        const optimalBatchSize = jobs.length >= 20000 ? 500 : jobs.length >= 10000 ? 300 : jobs.length >= 1000 ? 150 : 50;
        const optimalDelay = jobs.length >= 20000 ? 10 : jobs.length >= 10000 ? 20 : jobs.length >= 1000 ? 25 : 50;

        if (showProgress) {
          toastId = toast.loading(
            `📧 Processando ${jobs.length.toLocaleString()} emails em lotes ultra-otimizados...`,
            { 
              duration: Infinity,
              action: {
                label: "✕",
                onClick: () => toast.dismiss(toastId)
              }
            }
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
            enableLargeVolumeOptimizations: jobs.length >= 1000
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
      const throughput = Math.round((jobs.length / processingTime) * 1000);

      // Enhanced success/error alerts with dismissible close buttons
      if (summary.successCount === summary.total) {
        const alertMessage = jobs.length >= 10000
          ? `✅ Todos os ${summary.total.toLocaleString()} emails enviados simultaneamente! (Ultra-paralelo: ${throughput} emails/s)`
          : jobs.length >= 1000
          ? `✅ Todos os ${summary.total.toLocaleString()} emails enviados com sucesso! (${throughput} emails/s)`
          : `✅ Todos os ${summary.total} emails enviados simultaneamente! (${throughput} emails/s)`;
        
        toast.success(alertMessage, {
          duration: 15000,
          action: {
            label: "✕",
            onClick: () => {}
          }
        });
      } else if (summary.successCount > 0) {
        const alertMessage = `⚠️ ${summary.successCount.toLocaleString()} de ${summary.total.toLocaleString()} emails enviados (${summary.successRate}% sucesso). ${summary.errorCount.toLocaleString()} falharam.`;
        
        toast.warning(alertMessage, {
          duration: 20000,
          action: {
            label: "✕",
            onClick: () => {}
          }
        });
      } else {
        toast.error("❌ Falha ao enviar emails - Verifique as configurações", {
          duration: 20000,
          action: {
            label: "✕",
            onClick: () => {}
          }
        });
      }

      return {
        success: summary.successCount > 0,
        results,
        summary,
        processingTime,
        avgTimePerEmail: Math.round(avgTimePerEmail),
        throughput,
        parallelProcessing: useParallelSending && jobs.length <= 30000,
        ultraParallel: jobs.length >= 1000
      };
    } catch (error: any) {
      console.error("Erro durante envio em lote:", error);
      
      toast.error(`Erro durante envio em lote: ${error.message}`, {
        duration: 20000,
        action: {
          label: "✕",
          onClick: () => {}
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
