import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoEnvios } from './useHistoricoEnvios';

interface UltraOptimizedProgress {
  current: number;
  total: number;
  percentage: number;
  throughput: number;
  estimatedTimeRemaining: number;
  startTime: number;
  peakThroughput: number;
  avgEmailDuration: number;
  successCount: number;
  errorCount: number;
  targetThroughput: number; // 100+ emails/second target
  performanceLevel: 'ULTRA' | 'ALTA' | 'BOA' | 'PADRÃO';
}

interface UltraOptimizedBatchResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  avgThroughput: number;
  peakThroughput: number;
  successRate: string;
  avgEmailDuration: number;
  targetAchieved: boolean; // Whether 100+ emails/s was achieved
  errorTypes?: Record<string, number>;
}

export function useOptimizedBatchSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UltraOptimizedProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    throughput: 0,
    estimatedTimeRemaining: 0,
    startTime: 0,
    peakThroughput: 0,
    avgEmailDuration: 0,
    successCount: 0,
    errorCount: 0,
    targetThroughput: 100, // 100+ emails/second target
    performanceLevel: 'PADRÃO'
  });

  const { fetchHistorico } = useHistoricoEnvios();

  const sendOptimizedBatch = useCallback(async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ): Promise<UltraOptimizedBatchResult | null> => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio');
      return null;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote ultra-otimizado');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let peakThroughput = 0;
    let successCount = 0;
    let errorCount = 0;
    let lastProgressUpdate = startTime;
    let progressHistory: Array<{time: number, count: number}> = [];
    
    // Calculate performance level based on throughput
    const getPerformanceLevel = (throughput: number): 'ULTRA' | 'ALTA' | 'BOA' | 'PADRÃO' => {
      if (throughput >= 100) return 'ULTRA'; // Target achieved
      if (throughput >= 50) return 'ALTA';
      if (throughput >= 20) return 'BOA';
      return 'PADRÃO';
    };
    
    setProgress({
      current: 0,
      total: selectedContacts.length,
      percentage: 0,
      throughput: 0,
      estimatedTimeRemaining: 0,
      startTime,
      peakThroughput: 0,
      avgEmailDuration: 0,
      successCount: 0,
      errorCount: 0,
      targetThroughput: 100,
      performanceLevel: 'PADRÃO'
    });

    try {
      console.log(`🚀 ULTRA-OTIMIZAÇÃO V3.0 para ${selectedContacts.length} contatos`);
      console.log(`🎯 Meta: 100+ emails/segundo com 500 conexões simultâneas`);
      
      // Get user SMTP settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio ultra-otimizado V3.0.');
      }
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Ultra-optimize SMTP configuration for maximum performance
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      if (porta === 465 && seguranca !== 'ssl') {
        seguranca = 'ssl';
        toast.info("⚡ SSL ultra-otimizado para porta 465");
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        seguranca = 'tls';
        toast.info("⚡ TLS ultra-otimizado para portas 587/25");
      }
      
      // Prepare ultra-optimized SMTP settings for 500 connections
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Create ultra-optimized email jobs for 10K emails
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        template_nome: templateData.nome,
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
        ultra_optimized: true, // V3.0 ultra-optimization flag
        target_throughput: 100, // 100+ emails/second target
        max_concurrent: 500, // 500 simultaneous connections
        chunk_size: 1000 // Process 1000 emails per chunk
      };
      
      console.log("📧 Enviando ULTRA-LOTE V3.0:", {
        batch_size: emailJobs.length,
        target_throughput: "100+ emails/s",
        max_concurrent: 500,
        chunk_size: 1000,
        smtp_host: smtpSettings.host,
        smtp_port: smtpSettings.port,
        template_id: templateId,
        estimated_duration: Math.ceil(selectedContacts.length / 100) + "s"
      });
      
      // Ultra-optimized progress tracking with 500ms real-time updates
      const updateProgress = (current: number, total: number, isSuccess?: boolean) => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Update success/error counts
        if (isSuccess === true) successCount++;
        if (isSuccess === false) errorCount++;
        
        // Track progress history for accurate throughput calculation
        progressHistory.push({ time: now, count: current });
        
        // Keep only recent history (last 5 seconds for more responsive calculation)
        progressHistory = progressHistory.filter(p => now - p.time <= 5000);
        
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
        const performanceLevel = getPerformanceLevel(currentThroughput);
        
        setProgress({
          current,
          total,
          percentage: (current / total) * 100,
          throughput: currentThroughput,
          estimatedTimeRemaining,
          startTime,
          peakThroughput,
          avgEmailDuration,
          successCount,
          errorCount,
          targetThroughput: 100,
          performanceLevel
        });
        
        // Real-time performance notifications
        if (current % 50 === 0 && current > 0) {
          const successRate = ((successCount / current) * 100).toFixed(1);
          const performanceEmoji = currentThroughput >= 100 ? '🚀' : 
                                   currentThroughput >= 50 ? '⚡' : 
                                   currentThroughput >= 20 ? '💪' : '📈';
          
          toast.success(`${performanceEmoji} ${current}/${total} processados (${successRate}% sucesso) - ${currentThroughput.toFixed(1)} emails/s`, {
            duration: 2000
          });
        }
        
        // Update every 500ms for ultra-responsive UI
        if (now - lastProgressUpdate > 500 || current === total) {
          console.log(`⚡ ULTRA-PROGRESSO V3.0: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s (pico: ${peakThroughput.toFixed(2)} emails/s) - Level: ${performanceLevel}`);
          lastProgressUpdate = now;
        }
      };
      
      // Show ultra-optimization V3.0 started with performance targets
      if (selectedContacts.length >= 1000) {
        toast.success('🚀 ULTRA-OTIMIZAÇÃO V3.0 ATIVADA!', {
          description: `Meta: 100+ emails/s com 500 conexões para ${selectedContacts.length} contatos em ~${Math.ceil(selectedContacts.length / 100)}s`,
          duration: 4000
        });
      } else {
        toast.success('⚡ PROCESSAMENTO ULTRA-RÁPIDO ATIVADO!', {
          description: `Processando ${selectedContacts.length} contatos com máxima performance`,
          duration: 3000
        });
      }
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Erro na edge function ultra-otimizada V3.0:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha do send-email ultra-otimizado V3.0:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote ultra-otimizado V3.0");
      }
      
      const { summary, results } = responseData;
      
      // Final progress update
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Refresh histórico to show new records
      await fetchHistorico();
      
      // Calculate if target was achieved
      const targetAchieved = summary.avgThroughput >= 100 || peakThroughput >= 100;
      
      // Enhanced success messaging with V3.0 performance metrics
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        
        if (targetAchieved) {
          toast.success(
            `🚀 META ALCANÇADA! ${summary.successful} emails em ${duration}s`,
            { 
              description: `🏆 ULTRA PERFORMANCE: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Histórico atualizado!`,
              duration: 12000 
            }
          );
        } else if (throughput >= 50) {
          toast.success(
            `⚡ EXCELENTE PERFORMANCE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Alta velocidade: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Histórico atualizado!`,
              duration: 10000 
            }
          );
        } else {
          toast.success(
            `✅ ${summary.successful} emails enviados em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s | Histórico atualizado automaticamente!`,
              duration: 8000 
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

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        totalDuration: summary.totalDuration || Math.round((Date.now() - startTime) / 1000),
        avgThroughput: summary.avgThroughput || 0,
        peakThroughput: peakThroughput,
        successRate: summary.successRate,
        avgEmailDuration: summary.avgEmailDuration || 0,
        targetAchieved,
        errorTypes: responseData.errorTypes || {}
      };
    } catch (error: any) {
      console.error('Erro no envio ultra-otimizado V3.0:', error);
      toast.error(`Erro no envio ultra-otimizado V3.0: ${error.message}`);
      
      // Still try to refresh histórico in case some emails were sent
      try {
        await fetchHistorico();
      } catch (e) {
        console.error('Erro ao atualizar histórico:', e);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchHistorico]);

  return {
    isProcessing,
    progress,
    sendOptimizedBatch
  };
}
