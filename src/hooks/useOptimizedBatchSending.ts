
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoEnvios } from './useHistoricoEnvios';

interface OptimizedProgress {
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
  performanceLevel: 'EXCELENTE' | 'BOA' | 'PADRÃO' | 'BAIXA';
  chunkProgress: {
    current: number;
    total: number;
    chunkNumber: number;
  };
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
  targetAchieved: boolean;
  errorTypes?: Record<string, number>;
  gmailOptimized: boolean;
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
    avgEmailDuration: 0,
    successCount: 0,
    errorCount: 0,
    targetThroughput: 15, // 15 emails/s para Gmail otimizado
    performanceLevel: 'PADRÃO',
    chunkProgress: {
      current: 0,
      total: 0,
      chunkNumber: 0
    }
  });

  const { fetchHistorico } = useHistoricoEnvios();

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

    if (selectedContacts.length > 5000) {
      toast.error('Limite máximo de 5.000 contatos por lote otimizado');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    let peakThroughput = 0;
    let successCount = 0;
    let errorCount = 0;
    let progressHistory: Array<{time: number, count: number}> = [];
    
    const getPerformanceLevel = (throughput: number): 'EXCELENTE' | 'BOA' | 'PADRÃO' | 'BAIXA' => {
      if (throughput >= 12) return 'EXCELENTE'; // 80% do target
      if (throughput >= 8) return 'BOA';
      if (throughput >= 4) return 'PADRÃO';
      return 'BAIXA';
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
      targetThroughput: 15,
      performanceLevel: 'PADRÃO',
      chunkProgress: {
        current: 0,
        total: Math.ceil(selectedContacts.length / 200),
        chunkNumber: 0
      }
    });

    try {
      console.log(`🚀 ENVIO OTIMIZADO GMAIL para ${selectedContacts.length} contatos`);
      console.log(`🎯 Meta: 15 emails/segundo com chunks de 200 emails`);
      
      // Busca configurações SMTP do usuário
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio otimizado.');
      }
      
      // Busca dados do template
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Configuração SMTP otimizada para Gmail
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      // Otimizações específicas para Gmail
      if (userSettings.smtp_host.includes('gmail.com')) {
        if (porta === 465) {
          seguranca = 'ssl';
          toast.info("⚡ SSL otimizado para Gmail (porta 465)");
        } else if (porta === 587) {
          seguranca = 'tls';
          toast.info("⚡ TLS otimizado para Gmail (porta 587)");
        }
      }
      
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Prepara jobs de email otimizados
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

      const batchRequestData = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        use_smtp: true,
        gmail_optimized: true,
        target_throughput: 15,
        max_concurrent: 25,
        chunk_size: 200,
        rate_limit: {
          emails_per_second: 14,
          burst_limit: 100
        }
      };
      
      console.log("📧 Enviando lote otimizado:", {
        batch_size: emailJobs.length,
        target_throughput: "15 emails/s",
        max_concurrent: 25,
        chunk_size: 200,
        smtp_host: smtpSettings.host,
        gmail_optimized: true,
        estimated_duration: Math.ceil(selectedContacts.length / 15) + "s"
      });
      
      // Monitoramento de progresso otimizado
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
          targetThroughput: 15,
          performanceLevel,
          chunkProgress
        });
        
        // Notificações de progresso mais específicas
        if (current % 100 === 0 && current > 0) {
          const successRate = ((successCount / current) * 100).toFixed(1);
          const performanceEmoji = currentThroughput >= 12 ? '🚀' : 
                                   currentThroughput >= 8 ? '⚡' : 
                                   currentThroughput >= 4 ? '💪' : '📈';
          
          toast.success(`${performanceEmoji} ${current}/${total} processados (${successRate}% sucesso) - ${currentThroughput.toFixed(1)} emails/s`, {
            duration: 3000
          });
        }
        
        console.log(`📊 Progresso: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s (pico: ${peakThroughput.toFixed(2)}) - Level: ${performanceLevel}`);
      };
      
      // Notificação inicial otimizada
      const estimatedTime = Math.ceil(selectedContacts.length / 15);
      toast.success('⚡ ENVIO OTIMIZADO PARA GMAIL INICIADO!', {
        description: `Processando ${selectedContacts.length} contatos em ~${estimatedTime}s com rate limiting inteligente`,
        duration: 4000
      });
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Erro na função otimizada:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote otimizado");
      }
      
      const { summary, results } = responseData;
      
      // Atualização final do progresso
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Atualiza histórico
      await fetchHistorico();
      
      const targetAchieved = summary.avgThroughput >= 12 || peakThroughput >= 12; // 80% do target
      
      // Mensagens de sucesso otimizadas
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        
        if (targetAchieved) {
          toast.success(
            `🚀 EXCELENTE PERFORMANCE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `⚡ Gmail otimizado: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Histórico atualizado!`,
              duration: 10000 
            }
          );
        } else if (throughput >= 8) {
          toast.success(
            `⚡ BOA PERFORMANCE! ${summary.successful} emails em ${duration}s`,
            { 
              description: `Gmail: ${throughput.toFixed(2)} emails/s | Pico: ${peakThroughput.toFixed(2)} emails/s | Histórico atualizado!`,
              duration: 8000 
            }
          );
        } else {
          toast.success(
            `✅ ${summary.successful} emails enviados em ${duration}s`,
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
        gmailOptimized: true
      };
    } catch (error: any) {
      console.error('Erro no envio otimizado:', error);
      toast.error(`Erro no envio otimizado: ${error.message}`);
      
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
