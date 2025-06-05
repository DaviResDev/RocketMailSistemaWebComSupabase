
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedProgress {
  current: number;
  total: number;
  percentage: number;
  throughput: number;
  estimatedTimeRemaining: number;
  startTime: number;
}

interface OptimizedBatchResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  avgThroughput: number;
  successRate: string;
  errorTypes?: Record<string, number>;
}

export function useOptimizedBatchSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OptimizedProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    throughput: 0,
    estimatedTimeRemaining: 0,
    startTime: 0
  });

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

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return null;
    }

    setIsProcessing(true);
    const startTime = Date.now();
    
    setProgress({
      current: 0,
      total: selectedContacts.length,
      percentage: 0,
      throughput: 0,
      estimatedTimeRemaining: 0,
      startTime
    });

    try {
      console.log(`🚀 Iniciando envio otimizado para ${selectedContacts.length} contatos`);
      
      // Get user SMTP settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
        .single();
      
      if (!userSettings?.use_smtp || !userSettings?.smtp_host) {
        throw new Error('SMTP deve estar configurado e ativado para envio otimizado.');
      }
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw new Error(`Erro ao carregar template: ${templateError.message}`);
      if (!templateData) throw new Error('Template não encontrado');
      
      // Optimize SMTP configuration
      let porta = userSettings.email_porta || 587;
      let seguranca = userSettings.smtp_seguranca || 'tls';
      
      if (porta === 465 && seguranca !== 'ssl') {
        seguranca = 'ssl';
        toast.info("Configuração SSL otimizada automaticamente para porta 465");
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        seguranca = 'tls';
        toast.info("Configuração TLS otimizada automaticamente para portas 587/25");
      }
      
      // Prepare optimized SMTP settings
      const smtpSettings = {
        host: userSettings.smtp_host,
        port: porta,
        secure: seguranca === 'ssl',
        password: userSettings.smtp_pass,
        from_name: userSettings.smtp_from_name || 'RocketMail',
        from_email: userSettings.email_usuario || ''
      };
      
      // Create optimized email jobs
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
        attachments: templateData.attachments
      }));

      const batchRequestData = {
        batch: true,
        emails: emailJobs,
        smtp_settings: smtpSettings,
        use_smtp: true,
        optimized: true // Flag for optimized processing
      };
      
      console.log("📧 Enviando lote otimizado:", {
        batch_size: emailJobs.length,
        smtp_host: smtpSettings.host,
        smtp_port: smtpSettings.port,
        template_id: templateId
      });
      
      // Progress tracking with real-time updates
      let lastUpdateTime = startTime;
      const updateProgress = (current: number, total: number) => {
        const now = Date.now();
        const elapsed = now - startTime;
        const currentThroughput = current > 0 ? (current / elapsed) * 1000 : 0;
        const estimatedTimeRemaining = current > 0 ? ((total - current) / currentThroughput) * 1000 : 0;
        
        setProgress({
          current,
          total,
          percentage: (current / total) * 100,
          throughput: currentThroughput,
          estimatedTimeRemaining,
          startTime
        });
        
        // Update every 2 seconds or on significant progress
        if (now - lastUpdateTime > 2000 || current === total) {
          console.log(`📊 Progresso: ${current}/${total} (${((current/total)*100).toFixed(1)}%) - ${currentThroughput.toFixed(2)} emails/s`);
          lastUpdateTime = now;
        }
      };
      
      const response = await supabase.functions.invoke('send-email', {
        body: batchRequestData
      });
      
      if (response.error) {
        console.error("Erro na edge function otimizada:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Resposta de falha do send-email otimizado:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar emails em lote otimizado");
      }
      
      const { summary, results } = responseData;
      
      // Final progress update
      updateProgress(selectedContacts.length, selectedContacts.length);
      
      // Enhanced success messaging
      if (summary.successful > 0) {
        const duration = summary.totalDuration || Math.round((Date.now() - startTime) / 1000);
        const throughput = summary.avgThroughput || (summary.successful / duration);
        
        toast.success(
          `🚀 ${summary.successful} emails enviados em ${duration}s! Taxa: ${throughput.toFixed(2)} emails/s`,
          { duration: 8000 }
        );
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
      
      // Create entries in envios table for successful sends
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const successfulResults = results.filter((r: any) => r.success);
          const envioRecords = successfulResults.map((result: any) => {
            const email = result.to;
            const contact = selectedContacts.find(c => c.email === email || (typeof email === 'string' && email.includes(c.email)));
            
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
          }
        }
      } catch (err) {
        console.error("Erro ao salvar na tabela envios:", err);
      }

      return {
        success: summary.successful > 0,
        successCount: summary.successful,
        errorCount: summary.failed,
        totalDuration: summary.totalDuration || Math.round((Date.now() - startTime) / 1000),
        avgThroughput: summary.avgThroughput || 0,
        successRate: summary.successRate,
        errorTypes: responseData.errorTypes || {}
      };
    } catch (error: any) {
      console.error('Erro no envio otimizado:', error);
      toast.error(`Erro no envio otimizado: ${error.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    progress,
    sendOptimizedBatch
  };
}
