
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
      console.log(`🚀 Iniciando envio ULTRA RÁPIDO para ${selectedContacts.length} contatos`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
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
      
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: userSettings.email_porta || 587,
        secure: userSettings.smtp_seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || '',
        username: userSettings.email_usuario || ''
      };
      
      // CONFIGURAÇÃO ULTRA OTIMIZADA - VELOCIDADE MÁXIMA
      const isGmail = smtpSettings.host.includes('gmail');
      const isOutlook = smtpSettings.host.includes('outlook') || smtpSettings.host.includes('live');
      
      const optimization_config = {
        max_concurrent: isGmail ? 8 : isOutlook ? 10 : 15, // AUMENTADO DRASTICAMENTE
        delay_between_emails: isGmail ? 100 : isOutlook ? 50 : 25, // REDUZIDO AO MÍNIMO
        rate_limit_per_minute: isGmail ? 60 : isOutlook ? 80 : 120, // AUMENTADO MUITO
        burst_limit: isGmail ? 15 : isOutlook ? 20 : 30, // AUMENTADO
        provider_optimizations: true,
        intelligent_queuing: true,
        ultra_fast_mode: true // NOVO: Modo ultra rápido
      };
      
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
        attachments: Array.isArray(templateData.attachments) ? templateData.attachments : [],
        smtp_settings: smtpSettings
      }));

      // Progresso atualizado em tempo real mais rápido
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newCurrent = Math.min(prev.current + Math.ceil(emailJobs.length / 10), prev.total);
          return { ...prev, current: newCurrent };
        });
      }, 200); // Atualização muito mais rápida
      
      console.log("🔥 MODO ULTRA RÁPIDO ATIVADO:", {
        batch_size: emailJobs.length,
        provider: isGmail ? 'Gmail' : isOutlook ? 'Outlook' : 'Outro',
        max_concurrent: optimization_config.max_concurrent,
        delay_ms: optimization_config.delay_between_emails,
        ultra_fast: true
      });
      
      // Envio com múltiplas tentativas em paralelo
      let response;
      let attempt = 0;
      const maxAttempts = 2; // Reduzido para ser mais rápido
      
      while (attempt < maxAttempts) {
        try {
          attempt++;
          console.log(`⚡ Tentativa ${attempt}/${maxAttempts} - VELOCIDADE MÁXIMA`);
          
          response = await supabase.functions.invoke('send-email', {
            body: {
              batch: true,
              emails: emailJobs,
              smtp_settings: smtpSettings,
              optimization_config: optimization_config,
              use_smtp: true,
              ultra_fast_mode: true
            }
          });
          
          if (!response.error) break;
          
          if (attempt < maxAttempts) {
            console.log(`⏳ Retry rápido em ${500 * attempt}ms...`);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Retry muito mais rápido
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
      
      setProgress({ current: selectedContacts.length, total: selectedContacts.length });
      
      // ALERTAS MAIS CHAMATIVOS E RÁPIDOS (SEM TEMPO)
      if (summary.successful > 0) {
        toast.success(`🎯🔥 SUCESSO TOTAL! ${summary.successful} emails enviados`, {
          description: `⚡💥 Taxa de sucesso: ${summary.successRate} | Sistema Ultra Rápido Ativado!`,
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '2px solid #047857',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }
        });
      }
      
      if (summary.failed > 0) {
        toast.error(`⚠️ ${summary.failed} emails falharam`, {
          description: `Taxa de sucesso: ${summary.successRate}`,
          duration: 8000,
          style: {
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '2px solid #b91c1c',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)'
          }
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
      toast.error(`Erro no envio: ${error.message}`, {
        style: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });
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
