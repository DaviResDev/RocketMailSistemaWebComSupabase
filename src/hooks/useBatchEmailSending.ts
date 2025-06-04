
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BatchProgress {
  current: number;
  total: number;
}

interface EmailJob {
  contactId: string;
  templateId: string;
  contactName: string;
  contactEmail: string;
  customSubject?: string;
  customContent?: string;
}

interface BatchOptions {
  showProgress?: boolean;
  enableOptimizations?: boolean;
  useParallelSending?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export function useBatchEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0 });

  const sendEmailsInBatch = async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ) => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio');
      return false;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });

    try {
      console.log(`Iniciando envio em lote para ${selectedContacts.length} contatos`);
      
      // Create email jobs
      const emailJobs: EmailJob[] = selectedContacts.map(contact => ({
        contactId: contact.id,
        templateId: templateId,
        contactName: contact.nome,
        contactEmail: contact.email,
        customSubject,
        customContent
      }));

      // Use parallel sending for better performance
      const result = await sendBatchEmails(emailJobs, {
        showProgress: true,
        useParallelSending: true,
        enableOptimizations: selectedContacts.length >= 100
      });

      return result.success;
    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      toast.error(`Erro no envio em lote: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBatchEmails = async (emailJobs: EmailJob[], options: BatchOptions = {}) => {
    const {
      showProgress = true,
      useParallelSending = true,
      enableOptimizations = false,
      batchSize = useParallelSending ? (emailJobs.length >= 10000 ? 50 : 20) : 10,
      delayBetweenBatches = useParallelSending ? (emailJobs.length >= 10000 ? 25 : 50) : 100
    } = options;

    if (!emailJobs || emailJobs.length === 0) {
      toast.error('Nenhum email para enviar');
      return { success: false };
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: emailJobs.length });

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      if (useParallelSending && emailJobs.length >= 10) {
        // Ultra-parallel processing for large volumes
        console.log(`Enviando ${emailJobs.length} emails em modo paralelo (${batchSize} por lote)`);
        
        // Process in parallel batches
        for (let i = 0; i < emailJobs.length; i += batchSize) {
          const batch = emailJobs.slice(i, i + batchSize);
          
          // Send all emails in this batch simultaneously
          const batchPromises = batch.map(async (job, index) => {
            try {
              const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                  to: job.contactEmail,
                  contato_id: job.contactId,
                  template_id: job.templateId,
                  contato_nome: job.contactName,
                  subject: job.customSubject,
                  content: job.customContent
                }
              });

              if (error) throw error;
              if (!data?.success) throw new Error(data?.error || 'Falha no envio');

              return { success: true, index: i + index };
            } catch (error: any) {
              console.error(`Erro no email ${i + index + 1}:`, error);
              return { success: false, error: error.message, index: i + index };
            }
          });

          // Wait for all emails in this batch to complete
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Process results
          batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              if (result.value.success) {
                successCount++;
              } else {
                errorCount++;
                errors.push(`Email ${result.value.index + 1}: ${result.value.error}`);
              }
            } else {
              errorCount++;
              errors.push(`Email ${i + index + 1}: ${result.reason}`);
            }

            // Update progress
            const currentProgress = successCount + errorCount;
            setProgress({ current: currentProgress, total: emailJobs.length });
          });

          // Small delay between batches to prevent overwhelming the system
          if (i + batchSize < emailJobs.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }
      } else {
        // Sequential processing for smaller volumes or when parallel is disabled
        console.log(`Enviando ${emailJobs.length} emails sequencialmente`);
        
        for (let i = 0; i < emailJobs.length; i++) {
          const job = emailJobs[i];
          
          try {
            const { data, error } = await supabase.functions.invoke('send-email', {
              body: {
                to: job.contactEmail,
                contato_id: job.contactId,
                template_id: job.templateId,
                contato_nome: job.contactName,
                subject: job.customSubject,
                content: job.customContent
              }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Falha no envio');

            successCount++;
          } catch (error: any) {
            console.error(`Erro no email ${i + 1}:`, error);
            errorCount++;
            errors.push(`Email ${i + 1}: ${error.message}`);
          }

          setProgress({ current: i + 1, total: emailJobs.length });
          
          // Small delay between emails in sequential mode
          if (i < emailJobs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }

      // Show results
      const totalTime = Date.now();
      const successRate = Math.round((successCount / emailJobs.length) * 100);

      if (successCount === emailJobs.length) {
        toast.success(`🎉 Todos os ${successCount.toLocaleString()} emails enviados com sucesso!`);
      } else if (successCount > 0) {
        toast.success(`✅ ${successCount.toLocaleString()} emails enviados com sucesso`);
        if (errorCount > 0) {
          toast.warning(`⚠️ ${errorCount} emails falharam no envio`);
        }
      } else {
        toast.error(`❌ Falha completa: nenhum email foi enviado`);
      }

      console.log(`Envio concluído: ${successCount} sucessos, ${errorCount} falhas (${successRate}% taxa de sucesso)`);

      return {
        success: successCount > 0,
        successCount,
        errorCount,
        successRate,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('Erro crítico no envio em lote:', error);
      toast.error(`Erro crítico no processamento: ${error.message}`);
      return { success: false };
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    isSending: isProcessing, // Keep backward compatibility
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails
  };
}

export default useBatchEmailSending;
