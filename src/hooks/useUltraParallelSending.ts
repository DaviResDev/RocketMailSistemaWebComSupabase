
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoEnvios } from './useHistoricoEnvios';

interface UltraParallelProgress {
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
  targetThroughput: number;
  performanceLevel: 'CONQUISTADA' | 'EXCELENTE' | 'BOA' | 'PADRÃO';
  chunkProgress: {
    current: number;
    total: number;
    chunkNumber: number;
  };
  connectionsActive: number;
}

interface UltraParallelResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  avgThroughput: number;
  peakThroughput: number;
  successRate: string;
  avgEmailDuration: number;
  targetAchieved: boolean;
  errorTypes?: Record<string, number>;
  ultraParallelV5: boolean;
}

export function useUltraParallelSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UltraParallelProgress>({
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
    targetThroughput: 200, // 200 emails/s meta
    performanceLevel: 'PADRÃO',
    chunkProgress: {
      current: 0,
      total: 0,
      chunkNumber: 0
    },
    connectionsActive: 1000
  });

  const { fetchHistorico } = useHistoricoEnvios();

  const sendUltraParallel = useCallback(async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ): Promise<UltraParallelResult | null> => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio ultra-paralelo');
      return null;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por envio ultra-paralelo');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let peakThroughput = 0;
    let successCount = 0;
    let errorCount = 0;
    let progressHistory: Array<{time: number, count: number}> = [];
    
    const getPerformanceLevel = (throughput: number): 'CONQUISTADA' | 'EXCELENTE' | 'BOA' | 'PADRÃO' => {
      if (throughput >= 200) return 'CONQUISTADA'; // 200+ emails/s
      if (throughput >= 150) return 'EXCELENTE'; // 150+ emails/s
      if (throughput >= 100) return 'BOA'; // 100+ emails/s
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
      targetThroughput: 200,
      performanceLevel: 'PADRÃO',
      chunkProgress: {
        current: 0,
        total: Math.ceil(selectedContacts.length / 200),
        chunkNumber: 0
      },
      connectionsActive: 1000
    });

    try {
      console.log(`🚀 ULTRA-PARALLEL V5.0 para ${selectedContacts.length} contatos`);
      console.log(`🎯 META: 200+ emails/segundo com 1000 conexões simultâneas`);
      console.log(`⚡ Chunks de 200 emails sem delay entre chunks`);
      
      // Busca configurações SMTP do usuário
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio ultra-paralelo.');
      }
      
      // Busca dados do template
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Configuração SMTP ultra-agressiva
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Prepara jobs ultra-paralelos
      const emailJobs = selectedContacts.map((contact, index) => ({
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
        attachments: templateData.attachments,
        index: index
      }));

      const ultraParallelRequest = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        use_smtp: true,
        ultra_parallel_v5: true,
        target_throughput: 200,
        max_concurrent: 1000,
        chunk_size: 200,
        delay_between_chunks: 0,
        connection_timeout: 5000,
        max_retries: 1
      };
      
      console.log("🚀 Enviando ultra-paralelo V5.0:", {
        batch_size: emailJobs.length,
        target_throughput: "200+ emails/s",
        max_concurrent: 1000,
        chunk_size: 200,
        zero_delay: true,
        estimated_duration: Math.ceil(selectedContacts.length / 200) + "s"
      });
      
      // Monitoramento ultra-agressivo de progresso
      const updateProgress = (current: number, total: number, isSuccess?: boolean) => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (isSuccess === true) successCount++;
        if (isSuccess === false) errorCount++;
        
        progressHistory.push({ time: now, count: current });
        progressHistory = progressHistory.filter(p => now - p.time <= 5000); // 5s de histórico
        
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
        
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }
        
        const estimatedTimeRemaining = currentThroughput > 0 ? ((total - current) / currentThroughput) * 1000 : 0;
        const avgEmailDuration = current > 0 ? elapsed / current : 0;
        const performanceLevel = getPerformanceLevel(currentThroughput);
        
        // Calcula progresso do chunk atual
        const chunkSize = 200;
        const currentChunk = Math.floor(current / chunkSize);
        const totalChunks = Math.ceil(total / chunkSize);
        const chunkProgress = {
          current: current % chunkSize || (current === total ? chunkSize : current % chunkSize),
          total: chunkSize,
          chunkNumber: currentChunk + 1
        };
        
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
          targetThroughput: 200,
          performanceLevel,
          chunkProgress,
          connectionsActive: Math.min(1000, total - current)
        });
        
        // Notificações de conquista ultra-agressivas
        if (current % 200 === 0 && current > 0) {
          const successRate = ((successCount / current) * 100).toFixed(1);
          const performanceEmoji = currentThroughput >= 200 ? '🏆' : 
                                   currentThroughput >= 150 ? '🚀' : 
                                   currentThroughput >= 100 ? '⚡' : '💪';
          
          toast.success(`${performanceEmoji} ${current}/${total} ULTRA-PROCESSADOS (${successRate}% sucesso) - ${currentThroughput.toFixed(1)} emails/s`, {
            duration: 2000
          });
        }
        
        console.log(`🚀 ULTRA-PROGRESSO: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s (PICO: ${peakThroughput.toFixed(2)}) - ${performanceLevel}`);
      };
      
      // Notificação de início ultra-agressiva
      const estimatedTime = Math.ceil(selectedContacts.length / 200);
      toast.success('🚀 ULTRA-PARALLEL V5.0 INICIADO!', {
        description: `Processando ${selectedContacts.length} contatos em ~${estimatedTime}s com 1000 conexões simultâneas`,
        duration: 3000
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: ultraParallelRequest
      });
      
      if (response.error) {
        console.error("Erro na função ultra-paralela:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha:", responseData);
        throw new Error(responseData?.error || "Falha no envio ultra-paralelo V5.0");
      }
      
      const { summary, results } = responseData;
      
      // Atualização final do progresso
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Atualiza histórico
      await fetchHistorico();
      
      const targetAchieved = summary.avgThroughput >= 200 || peakThroughput >= 200;
      
      // Mensagens de conquista ultra-agressivas
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        
        if (targetAchieved) {
          toast.success(
            `🏆 META 200+ EMAILS/S CONQUISTADA! ${summary.successful} emails em ${duration}s`,
            { 
              description: `🚀 Ultra-Parallel V5.0: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | 1000 conexões!`,
              duration: 15000 
            }
          );
        } else if (throughput >= 150) {
          toast.success(
            `🚀 EXCELENTE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Ultra-Parallel: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Quase lá!`,
              duration: 10000 
            }
          );
        } else {
          toast.success(
            `⚡ ${summary.successful} emails enviados em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s | Histórico atualizado!`,
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
            duration: 8000
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
        errorTypes: responseData.errorTypes || {},
        ultraParallelV5: true
      };
    } catch (error: any) {
      console.error('Erro no envio ultra-paralelo:', error);
      toast.error(`Erro no envio ultra-paralelo V5.0: ${error.message}`);
      
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
    sendUltraParallel
  };
}
