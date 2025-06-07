
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoEnvios } from './useHistoricoEnvios';

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
      currentOperation: 'Sistema Ultra Rápido Iniciado...',
      estimatedTimeRemaining: 0,
      throughput: 0,
      queueStatus: { pending: 0, processing: false }
    });

    try {
      console.log(`🚀 SISTEMA ULTRA RÁPIDO INICIADO para ${selectedContacts.length} contatos`);
      console.log(`🎯 META: 100% de sucesso com velocidade máxima`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .eq('user_id', user.id)
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio otimizado.');
      }
      
      // SMTP configurado para velocidade máxima
      const baseSmtpSettings = {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || '',
        username: userSettings.email_usuario || ''
      };
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: 'SMTP Ultra Rápido Configurado - Máxima Velocidade!'
      }));
      
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: 'Template carregado. Fila ultra rápida preparada...'
      }));
      
      const isGmail = baseSmtpSettings.host.includes('gmail');
      const providerName = isGmail ? 'Gmail' : 'Outro provedor';
      
      toast.info(`⚡🔥 Sistema Ultra Rápido para ${providerName} - Velocidade Máxima Ativada!`, {
        style: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          fontWeight: 'bold'
        }
      });
      
      const attachments = Array.isArray(templateData.attachments) 
        ? templateData.attachments 
        : templateData.attachments 
          ? [templateData.attachments] 
          : [];
      
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        contact: {
          ...contact,
          user_id: user.id
        },
        user_id: user.id,
        image_url: templateData.image_url,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        attachments: attachments,
        smtp_settings: baseSmtpSettings
      }));
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: `${emailJobs.length} emails preparados. Enviando em velocidade máxima...`
      }));
      
      // Progresso ultra rápido
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newCurrent = Math.min(prev.current + 3, prev.total); // Muito mais rápido
          const percentage = (newCurrent / prev.total) * 100;
          const elapsed = (Date.now() - startTime) / 1000;
          const throughput = newCurrent > 0 ? newCurrent / elapsed : 0;
          const remaining = prev.total - newCurrent;
          const estimatedTimeRemaining = throughput > 0 ? (remaining / throughput) * 1000 : 0;
          
          return {
            ...prev,
            current: newCurrent,
            percentage,
            throughput,
            estimatedTimeRemaining,
            currentOperation: newCurrent < prev.total ? `Enviando ${newCurrent}/${prev.total} em alta velocidade...` : 'Finalizando...'
          };
        });
      }, 100); // Atualização muito mais rápida
      
      const response = await supabase.functions.invoke('send-email', {
        body: {
          batch: true,
          emails: emailJobs,
          smtp_settings: baseSmtpSettings,
          use_smtp: true,
          ultra_fast_mode: true
        }
      });
      
      clearInterval(progressInterval);
      
      if (response.error) {
        console.error("Erro na função otimizada:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails otimizados");
      }
      
      const { summary } = responseData;
      
      setProgress(prev => ({
        ...prev,
        current: selectedContacts.length,
        percentage: 100,
        successCount: summary.successful,
        errorCount: summary.failed,
        currentOperation: 'Ultra Rápido Concluído!'
      }));
      
      await fetchHistorico();
      
      // ALERTAS ULTRA CHAMATIVOS (SEM TEMPO)
      if (summary.successful === selectedContacts.length) {
        toast.success(
          `🎯🔥💥 SUCESSO TOTAL! ${summary.successful} emails enviados`,
          { 
            description: `⚡🚀 100% de sucesso com sistema ultra rápido!`,
            duration: 8000,
            style: {
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
              border: '3px solid #047857',
              boxShadow: '0 15px 35px rgba(16, 185, 129, 0.4)',
              borderRadius: '12px'
            }
          }
        );
      } else {
        toast.warning(
          `⚠️🔥 ${summary.successful}/${selectedContacts.length} emails enviados (${summary.successRate}%)`,
          {
            description: `${summary.failed} falhas - Sistema Ultra Rápido executado`,
            duration: 6000,
            style: {
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              border: '2px solid #b45309',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)'
            }
          }
        );
      }

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        totalDuration: summary.totalDuration || 0,
        successRate: summary.successRate,
        recommendations: [],
        metrics: summary
      };
      
    } catch (error: any) {
      console.error('Erro no envio otimizado:', error);
      toast.error(`Erro no sistema ultra rápido: ${error.message}`, {
        style: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });
      
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
