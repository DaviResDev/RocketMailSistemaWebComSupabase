
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BatchProgress {
  current: number;
  total: number;
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

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return false;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });

    try {
      console.log(`🚀 Iniciando envio em lote otimizado para ${selectedContacts.length} contatos`);
      
      // CORREÇÃO: Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // CORREÇÃO: Buscar configurações SMTP do usuário logado
      const { data: userSettings, error: settingsError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (settingsError || !userSettings) {
        throw new Error('Configurações do usuário não encontradas. Configure o SMTP nas configurações.');
      }
      
      if (!userSettings.use_smtp || !userSettings.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio em lote. Configure o SMTP nas configurações.');
      }
      
      // Buscar dados do template
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // CORREÇÃO: Configurações SMTP com mapeamento correto
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || '',
        username: userSettings.email_usuario || '' // CORREÇÃO: campo adicional
      };
      
      // Detectar provedor e aplicar otimizações específicas
      const isGmail = smtpSettings.host.includes('gmail');
      const isOutlook = smtpSettings.host.includes('outlook') || smtpSettings.host.includes('live');
      
      // Configuração de otimização baseada no provedor
      const optimization_config = {
        max_concurrent: isGmail ? 2 : isOutlook ? 3 : 5,
        delay_between_emails: isGmail ? 3000 : isOutlook ? 2000 : 1500,
        rate_limit_per_minute: isGmail ? 15 : isOutlook ? 20 : 25,
        burst_limit: isGmail ? 5 : isOutlook ? 8 : 10,
        provider_optimizations: true,
        intelligent_queuing: true
      };
      
      // CORREÇÃO: Preparar emails com dados completos incluindo user_id
      const emailJobs = selectedContacts.map(contact => ({
        to: contact.email,
        contato_id: contact.id,
        template_id: templateId,
        contato_nome: contact.nome,
        subject: customSubject || templateData.descricao || templateData.nome,
        content: customContent || templateData.conteudo,
        contact: {
          ...contact,
          user_id: user.id // CORREÇÃO: garantir user_id no contact
        },
        user_id: user.id, // CORREÇÃO: user_id no nível do email
        image_url: templateData.image_url,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        attachments: Array.isArray(templateData.attachments) ? templateData.attachments : [],
        smtp_settings: smtpSettings
      }));

      // Configurar monitoramento de progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newCurrent = Math.min(prev.current + Math.ceil(emailJobs.length / 20), prev.total);
          return { ...prev, current: newCurrent };
        });
      }, 1000);
      
      console.log("📧 Enviando lote otimizado:", {
        batch_size: emailJobs.length,
        provider: isGmail ? 'Gmail' : isOutlook ? 'Outlook' : 'Outro',
        max_concurrent: optimization_config.max_concurrent,
        delay_ms: optimization_config.delay_between_emails,
        smtp_host: smtpSettings.host,
        user_id: user.id
      });
      
      // CORREÇÃO: Fazer requisição para a Edge Function com retry
      let response;
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          attempt++;
          console.log(`🔄 Tentativa ${attempt}/${maxAttempts} de envio`);
          
          response = await supabase.functions.invoke('send-email', {
            body: {
              batch: true,
              emails: emailJobs,
              smtp_settings: smtpSettings,
              optimization_config: optimization_config,
              use_smtp: true
            }
          });
          
          if (!response.error) break;
          
          if (attempt < maxAttempts) {
            console.log(`⏳ Aguardando antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        } catch (error) {
          console.error(`Tentativa ${attempt} falhou:`, error);
          if (attempt === maxAttempts) throw error;
        }
      }
      
      clearInterval(progressInterval);
      
      if (response?.error) {
        console.error("Erro na função:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response?.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote");
      }
      
      const { summary } = responseData;
      
      // Atualizar progresso final
      setProgress({ current: selectedContacts.length, total: selectedContacts.length });
      
      // Notificações detalhadas
      if (summary.successful > 0) {
        toast.success(`🎯 ${summary.successful} emails enviados com sucesso!`, {
          description: `⚡ Taxa de sucesso: ${summary.successRate} | Duração: ${summary.totalDuration}s`,
          duration: 8000
        });
      }
      
      if (summary.failed > 0) {
        toast.error(`⚠️ ${summary.failed} emails falharam`, {
          description: `Taxa de sucesso: ${summary.successRate}`,
          duration: 10000
        });
      }

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        successRate: summary.successRate,
        totalDuration: summary.totalDuration,
        avgThroughput: summary.avgThroughput
      };
    } catch (error: any) {
      console.error('❌ Erro no envio em lote:', error);
      toast.error(`Erro no envio: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isSending: isProcessing,
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails: sendEmailsInBatch
  };
}

export default useBatchEmailSending;
