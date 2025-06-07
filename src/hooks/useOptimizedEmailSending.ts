
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoEnvios } from './useHistoricoEnvios';
import { 
  IntelligentEmailQueue, 
  emailMonitor, 
  optimizeSmtpSettings,
  SmtpConfigValidator 
} from '@/utils/emailOptimizations';

interface OptimizedSendingProgress {
  current: number;
  total: number;
  percentage: number;
  successCount: number;
  errorCount: number;
  currentOperation: string;
  estimatedTimeRemaining: number;
  throughput: number;
  queueStatus: { pending: number; processing: boolean };
}

interface OptimizedSendingResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  successRate: string;
  recommendations: string[];
  metrics: any;
}

export function useOptimizedEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OptimizedSendingProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    successCount: 0,
    errorCount: 0,
    currentOperation: '',
    estimatedTimeRemaining: 0,
    throughput: 0,
    queueStatus: { pending: 0, processing: false }
  });

  const { fetchHistorico } = useHistoricoEnvios();
  const emailQueue = new IntelligentEmailQueue();

  const sendOptimizedEmails = useCallback(async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ): Promise<OptimizedSendingResult | null> => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado para envio');
      return null;
    }

    if (selectedContacts.length > 100) {
      toast.warning('Para garantir 100% de sucesso, recomendamos lotes de até 100 contatos');
    }

    setIsProcessing(true);
    const startTime = Date.now();
    
    setProgress({
      current: 0,
      total: selectedContacts.length,
      percentage: 0,
      successCount: 0,
      errorCount: 0,
      currentOperation: 'Inicializando sistema otimizado...',
      estimatedTimeRemaining: 0,
      throughput: 0,
      queueStatus: { pending: 0, processing: false }
    });

    try {
      console.log(`🚀 SISTEMA OTIMIZADO INICIADO para ${selectedContacts.length} contatos`);
      console.log(`🎯 META: 100% de sucesso com rate limiting inteligente`);
      
      // Busca configurações SMTP do usuário
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio otimizado.');
      }
      
      // Valida e otimiza configurações SMTP
      const baseSmtpSettings = {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };

      const validation = SmtpConfigValidator.validateConfig(baseSmtpSettings);
      if (!validation.valid) {
        throw new Error(`Configuração SMTP inválida: ${validation.issues.join(', ')}`);
      }

      const optimizedSmtpSettings = optimizeSmtpSettings(baseSmtpSettings);
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: 'Configurações SMTP otimizadas para máxima compatibilidade'
      }));
      
      // Busca dados do template
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: 'Template carregado. Preparando fila inteligente...'
      }));
      
      // Detecta provedor de email para otimizações específicas
      const isGmail = optimizedSmtpSettings.host.includes('gmail');
      const providerName = isGmail ? 'Gmail' : 'Outro provedor';
      
      toast.info(`⚡ Sistema otimizado para ${providerName} - Rate limiting inteligente ativado`);
      
      // Adiciona todos os emails na fila inteligente
      const emailPromises = selectedContacts.map(async (contact, index) => {
        const emailId = await emailQueue.addEmail({
          to: contact.email,
          subject: customSubject || templateData.descricao || templateData.nome,
          content: customContent || templateData.conteudo,
          contato_id: contact.id,
          template_id: templateId,
          attachments: templateData.attachments,
          smtpSettings: optimizedSmtpSettings,
          metadata: {
            contato_nome: contact.nome,
            template_nome: templateData.nome,
            signature_image: userSettings?.signature_image || templateData.signature_image,
            index: index
          }
        });
        
        return emailId;
      });
      
      const emailIds = await Promise.all(emailPromises);
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: `${emailIds.length} emails adicionados à fila inteligente. Processando...`
      }));
      
      // Monitora progresso da fila
      const progressInterval = setInterval(() => {
        const queueStatus = emailQueue.getQueueStatus();
        const metrics = emailMonitor.getMetrics();
        const processed = metrics.totalSent + metrics.totalFailed;
        const elapsed = Date.now() - startTime;
        const throughput = processed > 0 ? (processed / elapsed) * 1000 : 0;
        const remaining = selectedContacts.length - processed;
        const estimatedTimeRemaining = throughput > 0 ? (remaining / throughput) * 1000 : 0;
        
        setProgress(prev => ({
          ...prev,
          current: processed,
          percentage: (processed / selectedContacts.length) * 100,
          successCount: metrics.totalSent,
          errorCount: metrics.totalFailed,
          throughput: throughput,
          estimatedTimeRemaining: estimatedTimeRemaining,
          queueStatus: queueStatus,
          currentOperation: queueStatus.processing 
            ? `Processando (${queueStatus.pending} na fila)` 
            : 'Aguardando processamento...'
        }));
        
        // Para quando todos foram processados
        if (processed >= selectedContacts.length) {
          clearInterval(progressInterval);
        }
      }, 1000);
      
      // Aguarda conclusão do processamento
      while (emailQueue.getQueueStatus().processing || emailQueue.getQueueStatus().pending > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      clearInterval(progressInterval);
      
      // Coleta métricas finais
      const finalMetrics = emailMonitor.getMetrics();
      const recommendations = emailMonitor.getRecommendations();
      const totalDuration = Math.round((Date.now() - startTime) / 1000);
      const successRate = ((finalMetrics.totalSent / selectedContacts.length) * 100).toFixed(2);
      
      // Atualiza progresso final
      setProgress(prev => ({
        ...prev,
        current: selectedContacts.length,
        percentage: 100,
        successCount: finalMetrics.totalSent,
        errorCount: finalMetrics.totalFailed,
        currentOperation: 'Processamento concluído!'
      }));
      
      // Atualiza histórico
      await fetchHistorico();
      
      // Mensagens de resultado
      if (finalMetrics.totalSent === selectedContacts.length) {
        toast.success(
          `🎯 SUCESSO TOTAL! ${finalMetrics.totalSent} emails enviados`,
          { 
            description: `⚡ 100% de sucesso em ${totalDuration}s com sistema otimizado!`,
            duration: 10000 
          }
        );
      } else {
        toast.warning(
          `⚠️ ${finalMetrics.totalSent}/${selectedContacts.length} emails enviados (${successRate}%)`,
          {
            description: `${finalMetrics.totalFailed} falhas - Recomendações: ${recommendations.slice(0, 2).join('; ')}`,
            duration: 8000
          }
        );
      }

      return {
        success: finalMetrics.totalSent > 0,
        successCount: finalMetrics.totalSent,
        errorCount: finalMetrics.totalFailed,
        totalDuration,
        successRate,
        recommendations,
        metrics: finalMetrics
      };
      
    } catch (error: any) {
      console.error('Erro no envio otimizado:', error);
      toast.error(`Erro no sistema otimizado: ${error.message}`);
      
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
    sendOptimizedEmails
  };
}
