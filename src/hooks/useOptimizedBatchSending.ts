import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedProgress {
  current: number;
  total: number;
  percentage: number;
  throughput: number;
  estimatedTimeRemaining: number;
  startTime: number;
  peakThroughput: number;
  avgEmailDuration: number;
}

interface OptimizedBatchResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  avgThroughput: number;
  peakThroughput: number;
  successRate: string;
  avgEmailDuration: number;
  errorTypes?: Record<string, number>;
}

export function useOptimizedBatchSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OptimizedProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    throughput: 0,
    estimatedTimeRemaining: 0,
    startTime: 0,
    peakThroughput: 0,
    avgEmailDuration: 0
  });

  const sendOptimizedBatch = useCallback(async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ): Promise<OptimizedBatchResult | null> => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio');
      return null;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let peakThroughput = 0;
    let lastProgressUpdate = startTime;
    let progressHistory: Array<{time: number, count: number}> = [];
    
    setProgress({
      current: 0,
      total: selectedContacts.length,
      percentage: 0,
      throughput: 0,
      estimatedTimeRemaining: 0,
      startTime,
      peakThroughput: 0,
      avgEmailDuration: 0
    });

    try {
      console.log(`🚀 Iniciando ULTRA-OTIMIZAÇÃO para ${selectedContacts.length} contatos`);
      
      // Get user SMTP settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio ultra-otimizado.');
      }
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Ultra-optimize SMTP configuration
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      if (porta === 465 && seguranca !== 'ssl') {
        seguranca = 'ssl';
        toast.info("⚡ SSL auto-otimizado para porta 465");
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        seguranca = 'tls';
        toast.info("⚡ TLS auto-otimizado para portas 587/25");
      }
      
      // Prepare ultra-optimized SMTP settings
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Create ultra-optimized email jobs
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        contact: contact,
        image_url: templateData.image_url,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        attachments: templateData.attachments
      }));

      const batchRequestData = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        use_smtp: true,
        optimized: true // Flag for ULTRA-optimized processing
      };
      
      console.log("📧 Enviando ULTRA-LOTE otimizado:", {
        batch_size: emailJobs.length,
        smtp_host: smtpSettings.host,
        smtp_port: smtpSettings.port,
        template_id: templateId,
        ultra_optimized: true
      });
      
      // Ultra-optimized progress tracking with real-time updates
      const updateProgress = (current: number, total: number) => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Track progress history for more accurate throughput calculation
        progressHistory.push({ time: now, count: current });
        
        // Keep only recent history (last 10 seconds)
        progressHistory = progressHistory.filter(p => now - p.time <= 10000);
        
        // Calculate current throughput from recent history
        let currentThroughput = 0;
        if (progressHistory.length >= 2) {
          const recent = progressHistory[progressHistory.length - 1];
          const older = progressHistory[0];
          const timeDiff = recent.time - older.time;
          const countDiff = recent.count - older.count;
          currentThroughput = timeDiff > 0 ? (countDiff / timeDiff) * 1000 : 0;
        } else if (current > 0 && elapsed > 0) {
          currentThroughput = (current / elapsed) * 1000;
        }
        
        // Update peak throughput
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }
        
        const estimatedTimeRemaining = currentThroughput > 0 ? ((total - current) / currentThroughput) * 1000 : 0;
        const avgEmailDuration = current > 0 ? elapsed / current : 0;
        
        setProgress({
          current,
          total,
          percentage: (current / total) * 100,
          throughput: currentThroughput,
          estimatedTimeRemaining,
          startTime,
          peakThroughput,
          avgEmailDuration
        });
        
        // Update every 500ms or on significant progress for ultra-responsive UI
        if (now - lastProgressUpdate > 500 || current === total) {
          console.log(`⚡ ULTRA-PROGRESSO: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s (pico: ${peakThroughput.toFixed(2)} emails/s)`);
          lastProgressUpdate = now;
        }
      };
      
      // Show ultra-optimization started
      toast.success('🚀 ULTRA-OTIMIZAÇÃO iniciada!', {
        description: `Processando ${selectedContacts.length} emails com máxima performance`,
        duration: 3000
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Erro na edge function ultra-otimizada:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha do send-email ultra-otimizado:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote ultra-otimizado");
      }
      
      const { summary, results } = responseData;
      
      // Final progress update
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Enhanced success messaging with performance metrics
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        const avgEmailDuration = summary.avgEmailDuration || 0;
        
        if (throughput >= 10) {
          toast.success(
            `🚀 PERFORMANCE EXCEPCIONAL! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Média: ${avgEmailDuration}ms/email`,
              duration: 10000 
            }
          );
        } else if (throughput >= 8) {
          toast.success(
            `⚡ ALTA PERFORMANCE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s`,
              duration: 8000 
            }
          );
        } else {
          toast.success(
            `✅ ${summary.successful} emails enviados em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s`,
              duration: 6000 
            }
          );
        }
      }
      
      if (summary.failed > 0) {
        const failedEmails = results.filter((r: any) => !r.success);
        const errorMessages = [...new Set(failedEmails.slice(0, 3).map((r: any) => r.error))];
        
        toast.error(
          `⚠️ ${summary.failed} emails falharam. Taxa de sucesso: ${summary.successRate}%`,
          {
            description: errorMessages.join('; '),
            duration: 10000
          }
        );
      }
      
      // Create entries in envios table for successful sends
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const successfulResults = results.filter((r: any) => r.success);
          const envioRecords = successfulResults.map((result: any) => {
            const email = result.to;
            const contact = selectedContacts.find(c => c.email === email || (typeof email === 'string' && email.includes(c.email)));
            
            return {
              contato_id: contact?.id,
              template_id: templateId,
              status: 'enviado',
              user_id: user.user.id,
              data_envio: new Date().toISOString()
            };
          }).filter(record => record.contato_id);
          
          if (envioRecords.length > 0) {
            await supabase.from('envios').insert(envioRecords);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar na tabela envios:", err);
      }

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        totalDuration: summary.totalDuration || Math.round((Date.now() - startTime) / 1000),
        avgThroughput: summary.avgThroughput || 0,
        peakThroughput: peakThroughput,
        successRate: summary.successRate,
        avgEmailDuration: summary.avgEmailDuration || 0,
        errorTypes: responseData.errorTypes || {}
      };
    } catch (error: any) {
      console.error('Erro no envio ultra-otimizado:', error);
      toast.error(`Erro no envio ultra-otimizado: ${error.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    progress,
    sendOptimizedBatch
  };
}
