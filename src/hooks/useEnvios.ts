
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Envio, EnvioFormData } from '@/types/envios';

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchEnvios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Usuário não autenticado');
      
      const { data: enviosData, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contato_id(*),
          template:template_id(*)
        `)
        .eq('user_id', data.user.id)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      
      setEnvios(enviosData || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de envios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimized template variable processing
  const processTemplateVariables = (content: string, contatoData: any) => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR');
    const formattedTime = currentDate.toLocaleTimeString('pt-BR');
    
    const replacements: Record<string, string> = {
      '{{nome}}': contatoData?.nome || '',
      '{{email}}': contatoData?.email || '',
      '{{telefone}}': contatoData?.telefone || '',
      '{{razao_social}}': contatoData?.razao_social || '',
      '{{cliente}}': contatoData?.cliente || '',
      '{{empresa}}': contatoData?.razao_social || 'Empresa',
      '{{cargo}}': contatoData?.cargo || 'Cargo',
      '{{produto}}': contatoData?.produto || 'Produto',
      '{{valor}}': contatoData?.valor || 'Valor',
      '{{vencimento}}': contatoData?.vencimento || 'Vencimento',
      '{{data}}': formattedDate,
      '{{hora}}': formattedTime
    };
    
    let processedContent = content;
    Object.entries(replacements).forEach(([variable, value]) => {
      processedContent = processedContent.split(variable).join(value);
    });
    
    return processedContent;
  };

  // Send email to single recipient with improved error handling
  const sendEmail = async (formData: EnvioFormData) => {
    setSending(true);
    
    try {
      const recipientEmail = formData.to;
      let contatoEmail = recipientEmail;
      let contatoNome = formData.contato_nome;
      let contatoData: any = null;
      
      if (!recipientEmail && formData.contato_id) {
        const { data: fetchedContatoData, error: contatoError } = await supabase
          .from('contatos')
          .select('*')
          .eq('id', formData.contato_id)
          .single();
        
        if (contatoError) {
          toast.error(`Não foi possível encontrar o contato: ${contatoError.message}`);
          setSending(false);
          return false;
        }
        
        contatoData = fetchedContatoData;
        contatoEmail = contatoData.email;
        contatoNome = contatoData.nome;
      }
      
      if (!contatoEmail) {
        toast.error('Email do destinatário não encontrado');
        setSending(false);
        return false;
      }
      
      const loadingToastId = toast.loading(`Enviando email para ${contatoNome || contatoEmail}...`);
      
      try {
        // Get template and user settings in parallel
        const [templateResult, userSettingsResult] = await Promise.all([
          supabase
            .from('templates')
            .select('*')
            .eq('id', formData.template_id)
            .single(),
          supabase
            .from('configuracoes')
            .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_seguranca, smtp_nome, use_smtp')
            .single()
        ]);
        
        if (templateResult.error) throw templateResult.error;
        const templateData = templateResult.data;
        const userSettings = userSettingsResult.data;

        // Process template content
        let processedContent = formData.content;
        if (!processedContent && templateData) {
          processedContent = processTemplateVariables(templateData.conteudo, contatoData);
        }
        
        // Handle attachments
        let parsedAttachments = formData.attachments;
        if (!parsedAttachments && templateData?.attachments) {
          try {
            if (typeof templateData.attachments === 'string') {
              parsedAttachments = JSON.parse(templateData.attachments);
            } else if (Array.isArray(templateData.attachments)) {
              parsedAttachments = templateData.attachments;
            } else {
              parsedAttachments = [templateData.attachments];
            }
          } catch (e) {
            console.error('Erro ao analisar anexos:', e);
            parsedAttachments = [];
          }
        }
        
        const signatureImage = formData.signature_image || userSettings?.signature_image || templateData.signature_image;
        
        // Prepare SMTP settings if configured and use_smtp is enabled
        const smtpSettings = userSettings?.use_smtp && userSettings?.email_smtp ? {
          host: userSettings.email_smtp,
          port: userSettings.email_porta,
          secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
          password: userSettings.email_senha,
          from_name: userSettings.smtp_nome || '',
          from_email: userSettings.email_usuario || ''
        } : null;
        
        const emailSubject = formData.subject || templateData?.descricao || templateData?.nome || "Sem assunto";
        
        const dataToSend = {
          to: contatoEmail,
          attachments: parsedAttachments || null,
          contato_id: formData.contato_id,
          template_id: formData.template_id,
          agendamento_id: formData.agendamento_id,
          contato_nome: contatoNome,
          subject: emailSubject,
          content: processedContent,
          signature_image: signatureImage,
          image_url: templateData?.image_url,
          smtp_settings: smtpSettings,
          use_smtp: userSettings?.use_smtp || false // ✅ Pass the use_smtp flag
        };
        
        console.log("Sending single email with data:", { 
          to: contatoEmail,
          template_id: formData.template_id,
          contato_id: formData.contato_id,
          has_attachments: !!parsedAttachments,
          subject: emailSubject,
          use_smtp: userSettings?.use_smtp || false // ✅ Log the use_smtp flag
        });
        
        const response = await supabase.functions.invoke('send-email', {
          body: dataToSend
        });
        
        if (response.error) {
          console.error("Edge function error:", response.error);
          throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
        }
        
        const responseData = response.data;
        if (!responseData || !responseData.success) {
          console.error("Failed response from send-email:", responseData);
          throw new Error(responseData?.error || "Falha ao enviar email");
        }
        
        console.log('Email enviado com sucesso:', responseData);
        
        toast.dismiss(loadingToastId);
        
        // Enhanced success message based on delivery method
        let successMessage = `Email enviado com sucesso para ${contatoNome || contatoEmail}`;
        if (responseData.provider === 'smtp') {
          successMessage += ` via SMTP! ✅`;
        } else if (responseData.fallback) {
          successMessage += ` via Resend (fallback)! ⚠️`;
          toast.info('SMTP falhou, mas o email foi enviado via Resend como fallback.');
        } else {
          successMessage += ` via Resend! 📨`;
        }
        
        toast.success(successMessage);
        
        // Create entry in envios table
        if (formData.contato_id && formData.template_id) {
          try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Usuário não autenticado');
            
            const envioRecord = {
              contato_id: formData.contato_id,
              template_id: formData.template_id,
              status: 'enviado',
              user_id: user.user.id,
              data_envio: new Date().toISOString()
            };
            
            const extraFields = formData.agendamento_id ? { agendamento_id: formData.agendamento_id } : {};
            
            await supabase.from('envios').insert({
              ...envioRecord,
              ...extraFields
            });
          } catch (err) {
            console.error("Error saving to envios table:", err);
          }
        }
        
        await fetchEnvios();
        return true;
        
      } catch (err: any) {
        console.error('Erro ao enviar email:', err);
        toast.dismiss(loadingToastId);
        
        // Display specific error messages based on error content
        let errorMessage = 'Erro ao enviar email';
        const errorMsg = typeof err.message === 'string' ? err.message : '';
        
        if (errorMsg.includes('SMTP falhou') && errorMsg.includes('Resend também falhou')) {
          errorMessage = 'Falha completa: SMTP e Resend falharam. Verifique suas configurações.';
        } else if (errorMsg.includes('autenticação SMTP')) {
          errorMessage = 'Falha de autenticação SMTP: Verifique suas configurações de email';
        } else if (errorMsg.includes('Email inválido')) {
          errorMessage = `Email inválido: ${errorMsg}`;
        } else if (errorMsg.includes('Timeout')) {
          errorMessage = 'Timeout de envio: Verifique sua conexão de internet';
        } else if (errorMsg.includes('SMTP ativado mas não configurado')) {
          errorMessage = 'SMTP ativado mas não configurado. Complete as configurações SMTP.';
        } else if (errorMsg) {
          errorMessage = errorMsg;
        }
        
        toast.error(errorMessage);
        return false;
      }
    } finally {
      setSending(false);
    }
  };

  // Send emails to multiple recipients in optimized batches
  const sendBatchEmails = async (emailsData: any[]) => {
    setSending(true);
    
    try {
      console.log(`Iniciando envio em lote para ${emailsData.length} destinatários`);
      
      const loadingToastId = toast.loading(`Preparando envio para ${emailsData.length} destinatários...`);
      
      try {
        // Get user settings
        const { data: userSettings } = await supabase
          .from('configuracoes')
          .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_seguranca, smtp_nome, use_smtp')
          .single();
        
        // Prepare SMTP settings if configured and use_smtp is enabled
        const smtpSettings = userSettings?.use_smtp && userSettings?.email_smtp ? {
          host: userSettings.email_smtp,
          port: userSettings.email_porta,
          secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
          password: userSettings.email_senha,
          from_name: userSettings.smtp_nome || '',
          from_email: userSettings.email_usuario || ''
        } : null;
        
        // Update toast
        toast.loading(`Processando envio em lotes para ${emailsData.length} destinatários...`, {
          id: loadingToastId
        });
        
        const batchRequestData = {
          batch: true,
          emails: emailsData,
          smtp_settings: smtpSettings,
          use_smtp: userSettings?.use_smtp || false // ✅ Pass the use_smtp flag
        };
        
        console.log("Sending batch email request with data:", {
          batch: true,
          total_emails: emailsData.length,
          use_smtp: userSettings?.use_smtp || false // ✅ Log the use_smtp flag
        });
        
        const response = await supabase.functions.invoke('send-email', {
          body: batchRequestData
        });
        
        if (response.error) {
          console.error("Batch email edge function error:", response.error);
          throw new Error(`Erro na função de envio em lote: ${response.error.message || response.error}`);
        }
        
        const responseData = response.data;
        if (!responseData || !responseData.success) {
          console.error("Failed batch email response:", responseData);
          throw new Error(responseData?.error || "Falha no envio em lote");
        }
        
        console.log('Envio em lote concluído:', responseData);
        
        toast.dismiss(loadingToastId);
        
        const { summary, results } = responseData;
        
        // Enhanced results display with delivery method information
        if (summary.successful > 0) {
          let successMessage = `${summary.successful} emails enviados com sucesso!`;
          if (summary.smtp > 0) {
            successMessage += ` (${summary.smtp} via SMTP)`;
          }
          if (summary.resend > 0) {
            successMessage += ` (${summary.resend} via Resend)`;
          }
          if (summary.fallback > 0) {
            successMessage += ` ⚠️ ${summary.fallback} usaram fallback`;
          }
          toast.success(successMessage);
        }
        
        if (summary.failed > 0) {
          const failedEmails = results.filter((r: any) => !r.success);
          const errorMessages = [...new Set(failedEmails.map((r: any) => r.error))].slice(0, 3);
          
          let errorDescription = '';
          if (errorMessages.some(msg => typeof msg === 'string' && msg.includes('SMTP falhou') && msg.includes('Resend também falhou'))) {
            errorDescription = 'Falha completa detectada em alguns emails';
          } else if (errorMessages.some(msg => typeof msg === 'string' && msg.includes('autenticação'))) {
            errorDescription = 'Erro de autenticação SMTP detectado';
          } else if (errorMessages.some(msg => typeof msg === 'string' && msg.includes('Email inválido'))) {
            errorDescription = 'Emails inválidos detectados';
          } else if (errorMessages.some(msg => typeof msg === 'string' && msg.includes('Timeout'))) {
            errorDescription = 'Timeout de conexão detectado';
          } else {
            errorDescription = errorMessages.filter(msg => typeof msg === 'string').join('; ');
          }
          
          toast.error(
            `${summary.failed} emails falharam no envio. Taxa de sucesso: ${summary.successRate}%`,
            {
              description: errorDescription,
              duration: 10000,
              action: {
                label: "x",
                onClick: () => toast.dismiss()
              }
            }
          );
          
          // Log failed emails for debugging
          console.warn("Failed emails:", failedEmails);
        }
        
        // Create entries in envios table for successful sends
        if (summary.successful > 0) {
          try {
            const { data: user } = await supabase.auth.getUser();
            if (user.user) {
              const successfulResults = results.filter((r: any) => r.success);
              const envioRecords = successfulResults.map((result: any) => {
                const emailData = emailsData.find(e => e.to === result.to.replace(/^".*" <(.+)>$/, '$1'));
                return {
                  contato_id: emailData?.contato_id,
                  template_id: emailData?.template_id,
                  status: 'enviado',
                  user_id: user.user.id,
                  data_envio: new Date().toISOString()
                };
              }).filter(record => record.contato_id && record.template_id);
              
              if (envioRecords.length > 0) {
                await supabase.from('envios').insert(envioRecords);
              }
            }
          } catch (err) {
            console.error("Error saving batch envios to database:", err);
          }
        }
        
        await fetchEnvios();
        return responseData;
        
      } catch (err: any) {
        console.error('Erro no envio em lote:', err);
        toast.dismiss(loadingToastId);
        
        // Display specific error messages for batch sending
        let errorMessage = 'Erro no envio em lote';
        const errorMsg = typeof err.message === 'string' ? err.message : '';
        
        if (errorMsg.includes('SMTP ativado mas não configurado')) {
          errorMessage = 'SMTP ativado mas não configurado: Complete as configurações SMTP';
        } else if (errorMsg.includes('autenticação SMTP')) {
          errorMessage = 'Falha de autenticação SMTP: Verifique suas configurações';
        } else if (errorMsg) {
          errorMessage = errorMsg;
        }
        
        toast.error(errorMessage, {
          action: {
            label: "x",
            onClick: () => toast.dismiss()
          }
        });
        return false;
      }
    } finally {
      setSending(false);
    }
  };

  const resendEnvio = async (id: string) => {
    setSending(true);
    
    try {
      const { data: envio, error: envioError } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contato_id(*)
        `)
        .eq('id', id)
        .single();
      
      if (envioError) throw envioError;
      
      const loadingToastId = toast.loading(`Reenviando email para ${envio.contato.nome}...`);
      
      // Get template data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', envio.template_id)
        .single();
        
      if (templateError) throw templateError;
      
      // Get user settings
      const { data: userSettings } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_seguranca, smtp_nome, use_smtp')
        .single();

      let parsedAttachments = null;
      if (templateData.attachments) {
        try {
          if (typeof templateData.attachments === 'string' && templateData.attachments !== '[]') {
            parsedAttachments = JSON.parse(templateData.attachments);
          } else if (Array.isArray(templateData.attachments)) {
            parsedAttachments = templateData.attachments;
          } else {
            parsedAttachments = [templateData.attachments];
          }
        } catch (err) {
          console.error('Erro ao analisar anexos:', err);
        }
      }
      
      const result = await sendEmail({
        contato_id: envio.contato_id,
        template_id: envio.template_id,
        attachments: parsedAttachments,
        signature_image: userSettings?.signature_image || templateData.signature_image,
        subject: templateData.descricao || templateData.nome
      });
      
      toast.dismiss(loadingToastId);
      
      if (result) {
        await supabase
          .from('envios')
          .update({ status: 'reenviado' })
          .eq('id', id);
          
        toast.success(`Email reenviado com sucesso para ${envio.contato.nome}!`);
      }
      
      return result;
    } catch (err: any) {
      console.error('Erro ao reenviar email:', err);
      toast.error(`Erro ao reenviar email: ${err.message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        fetchEnvios();
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  return {
    envios,
    loading,
    error,
    sending,
    fetchEnvios,
    sendEmail,
    sendBatchEmails,
    resendEnvio,
    processTemplateVariables
  };
}

export default useEnvios;
