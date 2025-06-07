
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
      currentOperation: 'Inicializando sistema otimizado...',
      estimatedTimeRemaining: 0,
      throughput: 0,
      queueStatus: { pending: 0, processing: false }
    });

    try {
      console.log(`🚀 SISTEMA OTIMIZADO INICIADO para ${selectedContacts.length} contatos`);
      console.log(`🎯 META: 100% de sucesso com rate limiting inteligente`);
      
      // CORREÇÃO: Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Busca configurações SMTP do usuário
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .eq('user_id', user.id)
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio otimizado.');
      }
      
      // CORREÇÃO: Configurações SMTP otimizadas com mapeamento correto
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
      const isGmail = baseSmtpSettings.host.includes('gmail');
      const providerName = isGmail ? 'Gmail' : 'Outro provedor';
      
      toast.info(`⚡ Sistema otimizado para ${providerName} - Rate limiting inteligente ativado`);
      
      // Properly handle attachments - ensure it's an array
      const attachments = Array.isArray(templateData.attachments) 
        ? templateData.attachments 
        : templateData.attachments 
          ? [templateData.attachments] 
          : [];
      
      // CORREÇÃO: Preparar emails com user_id garantido
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        contact: {
          ...contact,
          user_id: user.id // CORREÇÃO: garantir user_id
        },
        user_id: user.id, // CORREÇÃO: user_id no nível do email
        image_url: templateData.image_url,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        attachments: attachments,
        smtp_settings: baseSmtpSettings
      }));
      
      setProgress(prev => ({ 
        ...prev, 
        currentOperation: `${emailJobs.length} emails preparados. Enviando via SMTP...`
      }));
      
      // Monitoramento de progresso simulado
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newCurrent = Math.min(prev.current + 1, prev.total);
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
            currentOperation: newCurrent < prev.total ? `Processando ${newCurrent}/${prev.total}...` : 'Finalizando...'
          };
        });
      }, 1000);
      
      // CORREÇÃO: Chamar a Edge Function diretamente
      const response = await supabase.functions.invoke('send-email', {
        body: {
          batch: true,
          emails: emailJobs,
          smtp_settings: baseSmtpSettings,
          use_smtp: true
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
      
      // Atualizar progresso final
      setProgress(prev => ({
        ...prev,
        current: selectedContacts.length,
        percentage: 100,
        successCount: summary.successful,
        errorCount: summary.failed,
        currentOperation: 'Processamento concluído!'
      }));
      
      // Atualizar histórico
      await fetchHistorico();
      
      // Mensagens de resultado
      if (summary.successful === selectedContacts.length) {
        toast.success(
          `🎯 SUCESSO TOTAL! ${summary.successful} emails enviados`,
          { 
            description: `⚡ 100% de sucesso em ${summary.totalDuration}s com sistema otimizado!`,
            duration: 10000 
          }
        );
      } else {
        toast.warning(
          `⚠️ ${summary.successful}/${selectedContacts.length} emails enviados (${summary.successRate}%)`,
          {
            description: `${summary.failed} falhas - Verifique configurações SMTP`,
            duration: 8000
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
