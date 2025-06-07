
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
      
      // Get user SMTP settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio em lote. Configure o SMTP nas configurações.');
      }
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Otimizar configuração de porta/segurança
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      // Auto-corrigir configurações SSL/TLS com base na porta
      if (porta === 465 && seguranca !== 'ssl') {
        console.log("⚠️ Porta 465 detectada com segurança TLS. Ajustando para SSL.");
        seguranca = 'ssl';
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        console.log("⚠️ Porta 587/25 detectada com segurança SSL. Ajustando para TLS.");
        seguranca = 'tls';
      }
      
      // Configurações SMTP otimizadas
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Detectar provedor e aplicar otimizações específicas
      const isGmail = smtpSettings.host.includes('gmail');
      const isOutlook = smtpSettings.host.includes('outlook') || smtpSettings.host.includes('live');
      
      // Configuração de otimização baseada no provedor
      const optimization_config = {
        max_concurrent: isGmail ? 1 : isOutlook ? 2 : 3,
        delay_between_emails: isGmail ? 5000 : isOutlook ? 3000 : 2000,
        rate_limit_per_minute: isGmail ? 10 : isOutlook ? 15 : 20,
        burst_limit: isGmail ? 3 : isOutlook ? 5 : 8,
        provider_optimizations: true,
        intelligent_queuing: true
      };
      
      // Properly handle attachments
      const attachments = Array.isArray(templateData.attachments) 
        ? templateData.attachments 
        : templateData.attachments 
          ? [templateData.attachments] 
          : [];

      // Preparar emails com dados completos
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
        attachments: attachments,
        smtp_settings: smtpSettings
      }));

      // Requisição otimizada com configuração completa
      const batchRequestData = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        optimization_config: optimization_config,
        use_smtp: true
      };
      
      console.log("📧 Enviando lote otimizado:", {
        batch_size: emailJobs.length,
        provider: isGmail ? 'Gmail' : isOutlook ? 'Outlook' : 'Outro',
        rate_limit: optimization_config.rate_limit_per_minute,
        delay_ms: optimization_config.delay_between_emails,
        smtp_host: smtpSettings.host,
        optimization_enabled: true
      });
      
      // Simular progresso durante o processamento
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.current < prev.total) {
            const newCurrent = Math.min(prev.current + 1, prev.total);
            return { ...prev, current: newCurrent };
          }
          return prev;
        });
      }, optimization_config.delay_between_emails);
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      clearInterval(progressInterval);
      
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
      
      // Atualizar progresso final
      setProgress({ current: selectedContacts.length, total: selectedContacts.length });
      
      // Notificações de sucesso com detalhes
      if (summary.successful > 0) {
        const duration = summary.totalDuration || 0;
        const throughput = duration > 0 ? (summary.successful / duration).toFixed(2) : '0';
        
        toast.success(`🎯 ${summary.successful} emails enviados com sucesso!`, {
          description: `⚡ Sistema otimizado: ${throughput} emails/s | Duração: ${duration}s | Histórico atualizado`,
          duration: 8000
        });
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
        
        console.warn("Emails com falha:", failedEmails);
      }
      
      // Registrar envios bem-sucedidos no histórico
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const successfulResults = results.filter((r: any) => r.success);
          const envioRecords = successfulResults.map((result: any) => {
            const email = result.email;
            const contact = selectedContacts.find(c => c.email === email);
            
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
            console.log(`✅ ${envioRecords.length} registros salvos no histórico`);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar no histórico:", err);
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
      console.error('❌ Erro no envio em lote otimizado:', error);
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
