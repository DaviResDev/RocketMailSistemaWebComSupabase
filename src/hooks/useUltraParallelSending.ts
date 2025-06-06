
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
    targetThroughput: 50, // Reduzido de 200 para 50 emails/s
    performanceLevel: 'PADRÃO',
    chunkProgress: {
      current: 0,
      total: 0,
      chunkNumber: 0
    },
    connectionsActive: 50 // Reduzido de 1000 para 50 conexões
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

    if (selectedContacts.length > 5000) { // Reduzido de 10.000 para 5.000
      toast.error('Limite máximo de 5.000 contatos por envio ultra-paralelo');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let peakThroughput = 0;
    let successCount = 0;
    let errorCount = 0;
    let progressHistory: Array<{time: number, count: number}> = [];
    
    const getPerformanceLevel = (throughput: number): 'CONQUISTADA' | 'EXCELENTE' | 'BOA' | 'PADRÃO' => {
      if (throughput >= 50) return 'CONQUISTADA'; // Ajustado para 50+ emails/s
      if (throughput >= 35) return 'EXCELENTE'; // 35+ emails/s
      if (throughput >= 20) return 'BOA'; // 20+ emails/s
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
      targetThroughput: 50, // Meta ajustada
      performanceLevel: 'PADRÃO',
      chunkProgress: {
        current: 0,
        total: Math.ceil(selectedContacts.length / 50), // Chunks menores
        chunkNumber: 0
      },
      connectionsActive: 50 // Conexões reduzidas
    });

    try {
      console.log(`🚀 ULTRA-PARALLEL V6.0 OTIMIZADO para ${selectedContacts.length} contatos`);
      console.log(`🎯 META REALISTA: 50 emails/segundo com 50 conexões simultâneas`);
      console.log(`⚡ Chunks de 50 emails com delays otimizados`);
      
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
      
      // Configuração SMTP otimizada e conservadora
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
      
      // Prepara jobs ultra-paralelos otimizados
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
        ultra_parallel_v6: true, // Nova versão otimizada
        target_throughput: 50, // Meta realista
        max_concurrent: 50, // Conexões reduzidas
        chunk_size: 50, // Chunks menores
        delay_between_chunks: 2000, // 2s delay entre chunks
        connection_timeout: 30000, // 30s timeout (aumentado)
        max_retries: 3, // Mais retries
        rate_limiting: {
          emails_per_second: 2, // Rate limit conservador
          burst_limit: 10,
          backoff_multiplier: 1.5
        },
        smtp_optimizations: {
          connection_pooling: true,
          keep_alive: true,
          connection_reuse: true
        }
      };
      
      console.log("🚀 Enviando ultra-paralelo V6.0 OTIMIZADO:", {
        batch_size: emailJobs.length,
        target_throughput: "50 emails/s (meta realista)",
        max_concurrent: 50,
        chunk_size: 50,
        delay_between_chunks: "2000ms",
        connection_timeout: "30s",
        max_retries: 3,
        estimated_duration: Math.ceil(selectedContacts.length / 25) + "s" // Estimativa mais conservadora
      });
      
      // Monitoramento otimizado de progresso
      const updateProgress = (current: number, total: number, isSuccess?: boolean) => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (isSuccess === true) successCount++;
        if (isSuccess === false) errorCount++;
        
        progressHistory.push({ time: now, count: current });
        progressHistory = progressHistory.filter(p => now - p.time <= 10000); // 10s de histórico
        
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
        const chunkSize = 50;
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
          targetThroughput: 50,
          performanceLevel,
          chunkProgress,
          connectionsActive: Math.min(50, total - current)
        });
        
        // Notificações otimizadas
        if (current % 50 === 0 && current > 0) {
          const successRate = ((successCount / current) * 100).toFixed(1);
          const performanceEmoji = currentThroughput >= 50 ? '🏆' : 
                                   currentThroughput >= 35 ? '🚀' : 
                                   currentThroughput >= 20 ? '⚡' : '💪';
          
          toast.success(`${performanceEmoji} ${current}/${total} PROCESSADOS (${successRate}% sucesso) - ${currentThroughput.toFixed(1)} emails/s`, {
            duration: 3000
          });
        }
        
        console.log(`🚀 PROGRESSO OTIMIZADO: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s (PICO: ${peakThroughput.toFixed(2)}) - ${performanceLevel}`);
      };
      
      // Notificação de início otimizada
      const estimatedTime = Math.ceil(selectedContacts.length / 25); // Estimativa mais conservadora
      toast.success('🚀 ULTRA-PARALLEL V6.0 OTIMIZADO INICIADO!', {
        description: `Processando ${selectedContacts.length} contatos em ~${estimatedTime}s com configurações otimizadas`,
        duration: 4000
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: ultraParallelRequest
      });
      
      if (response.error) {
        console.error("Erro na função ultra-paralela otimizada:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha:", responseData);
        throw new Error(responseData?.error || "Falha no envio ultra-paralelo V6.0 otimizado");
      }
      
      const { summary, results } = responseData;
      
      // Atualização final do progresso
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Atualiza histórico
      await fetchHistorico();
      
      const targetAchieved = summary.avgThroughput >= 35 || peakThroughput >= 35; // Meta ajustada
      
      // Mensagens de sucesso otimizadas
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        const successRate = ((summary.successful / selectedContacts.length) * 100).toFixed(1);
        
        if (targetAchieved) {
          toast.success(
            `🏆 META CONQUISTADA! ${summary.successful} emails em ${duration}s`,
            { 
              description: `🚀 Ultra-Parallel V6.0: ${throughput.toFixed(2)} emails/s | Taxa: ${successRate}% | Configurações otimizadas!`,
              duration: 12000 
            }
          );
        } else if (throughput >= 20) {
          toast.success(
            `🚀 BOA PERFORMANCE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Ultra-Parallel: ${throughput.toFixed(2)} emails/s | Taxa: ${successRate}% | Sistema estabilizado!`,
              duration: 10000 
            }
          );
        } else {
          toast.success(
            `⚡ ${summary.successful} emails enviados em ${duration}s`,
            { 
              description: `Taxa: ${throughput.toFixed(2)} emails/s | Sucesso: ${successRate}% | Histórico atualizado!`,
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
        errorTypes: responseData.errorTypes || {},
        ultraParallelV5: true
      };
    } catch (error: any) {
      console.error('Erro no envio ultra-paralelo otimizado:', error);
      toast.error(`Erro no envio ultra-paralelo V6.0: ${error.message}`);
      
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
