
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  cc?: string[];
  bcc?: string[];
  contato_id?: string;
  template_id?: string;
  user_id: string;
  agendamento_id?: string;
  attachments?: AttachmentData[];
  isTest?: boolean;
}

interface AttachmentData {
  filename: string;
  content: string; // Base64 encoded content
  contentType: string;
}

interface SmtpConfig {
  server: string;
  port: number;
  user: string;
  password: string;
  security: string;
  nome: string;
  use_smtp: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Log environment variables (without revealing full keys)
    console.log("SUPABASE_URL available:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!supabaseServiceKey);
    console.log("RESEND_API_KEY available:", !!resendApiKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Erro de configuração do servidor",
          error: "Erro de configuração do servidor: Credenciais Supabase faltando" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate request
    let requestData: EmailRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Formato de requisição inválido",
          error: "Formato JSON inválido" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments, isTest, agendamento_id } = requestData;
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Dados incompletos para envio de email",
          error: "Dados obrigatórios faltando: destinatário, assunto, conteúdo ou ID do usuário" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate recipient email format
    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(to)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email de destinatário inválido",
          error: "Formato de email inválido para o destinatário" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Preparando para enviar email para: ${to}`);
    console.log(`Assunto: ${subject}`);
    
    // Get settings from database for the specified user
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Erro ao buscar configurações",
          error: "Erro ao buscar configurações de email: " + settingsError.message 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!settingsData) {
      console.error("Email settings not found for user:", user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Configurações não encontradas",
          error: "Configurações de email não encontradas para o usuário" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const emailConfig = settingsData;
    console.log("Email configuration:", JSON.stringify({
      use_smtp: emailConfig.use_smtp,
      email_smtp: emailConfig.email_smtp ? "configured" : "not configured",
      smtp_nome: emailConfig.smtp_nome || "not defined",
      email_usuario: emailConfig.email_usuario ? "configured" : "not configured"
    }));
    
    // Check SMTP configuration
    const smtpConfig: SmtpConfig = {
      server: emailConfig.email_smtp,
      port: emailConfig.email_porta,
      user: emailConfig.email_usuario,
      password: emailConfig.email_senha,
      security: emailConfig.smtp_seguranca || 'tls',
      nome: emailConfig.smtp_nome || '',
      use_smtp: Boolean(emailConfig.use_smtp)
    };
    
    // Check if all required fields for SMTP are present
    const useSmtp = smtpConfig.use_smtp && 
                    smtpConfig.server && 
                    smtpConfig.port && 
                    smtpConfig.user && 
                    smtpConfig.password;
    
    console.log("Using SMTP:", useSmtp);
    
    // Generate signature with area_negocio if available
    let signature = "";
    if (emailConfig.area_negocio) {
      signature += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    signature += `<div style="margin-top: 5px;">${emailConfig.email_usuario || ''}</div>`;

    // Create HTML content with customized content
    // Replace placeholders with real data if not a test email
    let processedContent = content;
    
    // If not a test email, try to get contact information for personalization
    if (!isTest && contato_id) {
      try {
        const { data: contatoData } = await supabaseClient
          .from('contatos')
          .select('*')
          .eq('id', contato_id)
          .maybeSingle();
          
        if (contatoData) {
          processedContent = processedContent
            .replace(/{nome}/g, contatoData.nome || "")
            .replace(/{email}/g, contatoData.email || "")
            .replace(/{telefone}/g, contatoData.telefone || "")
            .replace(/{razao_social}/g, contatoData.razao_social || "")
            .replace(/{cliente}/g, contatoData.cliente || "");
        }
      } catch (error) {
        console.error("Error fetching contact data for personalization:", error);
        // Continue without personalization if there's an error
      }
    }
    
    // Replace date placeholders
    const currentDate = new Date();
    processedContent = processedContent
      .replace(/{dia}/g, currentDate.toLocaleDateString('pt-BR'));

    // Create final HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px;">
          ${processedContent.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <div style="padding: 10px; font-size: 12px; color: #666;">
          ${signature}
        </div>
      </div>
    `;

    try {
      // Process attachments if any
      const processedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        console.log(`Processing ${attachments.length} attachments`);
        
        for (const attachment of attachments) {
          try {
            processedAttachments.push({
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            });
            
            console.log(`Attachment processed: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }
      }

      let sendResult;
      
      // Se o usuário configurou SMTP e quer usar SMTP
      if (useSmtp) {
        console.log("Enviando e-mail via SMTP direto");
        
        try {
          // Configurar cliente SMTP
          const client = new SmtpClient();
          
          // Conectar ao servidor SMTP
          await client.connectTLS({
            hostname: smtpConfig.server,
            port: smtpConfig.port,
            username: smtpConfig.user,
            password: smtpConfig.password,
          });
          
          // Preparar dados do email
          const emailData = {
            from: `${smtpConfig.nome} <${smtpConfig.user}>`,
            to: to,
            subject: subject,
            content: "text/html",
            html: htmlContent,
          };
          
          // Adicionar CC se fornecidos
          if (cc && cc.length > 0) {
            emailData.cc = cc.join(', ');
          }
          
          // Adicionar BCC se fornecidos
          if (bcc && bcc.length > 0) {
            emailData.bcc = bcc.join(', ');
          }
          
          // TODO: Implementar anexos para SMTP direto
          if (processedAttachments.length > 0) {
            console.log("Aviso: Anexos ainda não são suportados com envio SMTP direto");
          }
          
          // Enviar email
          await client.send(emailData);
          
          // Fechar conexão
          await client.close();
          
          console.log("Email enviado com sucesso via SMTP direto");
          
          sendResult = {
            id: `smtp-${Date.now()}`,
            provider: "smtp",
            success: true,
            from: smtpConfig.user,
            reply_to: smtpConfig.user,
            server: smtpConfig.server,
            port: smtpConfig.port
          };
        } catch (smtpError) {
          console.error("Erro ao enviar via SMTP direto:", smtpError);
          
          // Tentar fallback para Resend se disponível
          if (resendApiKey) {
            console.log("Falha no SMTP, tentando fallback para Resend");
            
            const resend = new Resend(resendApiKey);
            const fromName = smtpConfig.nome || "DisparoPro";
            const fromEmail = "onboarding@resend.dev";
            const replyToEmail = smtpConfig.user;
            
            const emailData = {
              from: `${fromName} <${fromEmail}>`,
              to: [to],
              subject: subject,
              html: htmlContent,
              reply_to: replyToEmail
            };
            
            if (cc && cc.length > 0) {
              emailData.cc = cc;
            }
            
            if (bcc && bcc.length > 0) {
              emailData.bcc = bcc;
            }
            
            if (processedAttachments.length > 0) {
              emailData.attachments = processedAttachments.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
              }));
            }
            
            const result = await resend.emails.send(emailData);
            
            if (result.error) {
              throw new Error(`Falha no SMTP e no fallback Resend: ${smtpError.message} e ${result.error.message}`);
            }
            
            console.log("Email enviado com sucesso via Resend (fallback após falha SMTP)");
            
            sendResult = {
              id: result.id,
              provider: "resend_fallback",
              success: true,
              from: fromEmail,
              reply_to: replyToEmail,
              original_error: smtpError.message
            };
          } else {
            // Sem fallback disponível, lançar erro original
            throw smtpError;
          }
        }
      } else if (resendApiKey) {
        // Usar Resend se configurado e SMTP não estiver disponível ou não for desejado
        console.log("Enviando e-mail com API do Resend");
        
        const resend = new Resend(resendApiKey);
        const fromName = smtpConfig.nome || "DisparoPro";
        const fromEmail = "onboarding@resend.dev";
        const replyToEmail = smtpConfig.user;
        
        console.log(`Enviando com Resend como: ${fromName} <${fromEmail}> com responder-para: ${replyToEmail}`);
        
        // Prepare email data for Resend with proper headers
        const emailData = {
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlContent,
          reply_to: replyToEmail
        };
        
        // Add CC recipients if provided
        if (cc && cc.length > 0) {
          emailData.cc = cc;
        }
        
        // Add BCC recipients if provided
        if (bcc && bcc.length > 0) {
          emailData.bcc = bcc;
        }
        
        // Add attachments if any
        if (processedAttachments.length > 0) {
          emailData.attachments = processedAttachments.map(attachment => ({
            filename: attachment.filename,
            content: attachment.content, // Resend expects content as base64 string
          }));
        }
        
        console.log("Dados do email preparados para Resend:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          reply_to: emailData.reply_to || "não definido"
        }));

        const result = await resend.emails.send(emailData);
        console.log("Resposta do Resend:", result);
        
        if (!result) {
          throw new Error("Resposta inválida do serviço de email");
        }
        
        if (result.error) {
          throw new Error(result.error.message || "Erro desconhecido ao enviar email");
        }
        
        console.log("Email enviado com sucesso via Resend. ID:", result.id);
        
        sendResult = {
          id: result.id,
          provider: "resend",
          success: true,
          from: fromEmail,
          reply_to: emailData.reply_to
        };
      } else {
        // Não temos nem SMTP nem Resend configurados
        throw new Error("Nenhum método de envio de email disponível. Configure SMTP ou adicione a chave API Resend.");
      }
      
      // Email sent successfully - Update status if needed
      if (contato_id && template_id && user_id) {
        try {
          const { data: envios } = await supabaseClient
            .from('envios')
            .select('id')
            .eq('contato_id', contato_id)
            .eq('template_id', template_id)
            .eq('user_id', user_id)
            .order('data_envio', { ascending: false })
            .limit(1);
            
          if (envios && envios.length > 0) {
            await supabaseClient
              .from('envios')
              .update({ 
                status: 'entregue',
                resposta_smtp: JSON.stringify(sendResult),
                erro: null
              })
              .eq('id', envios[0].id);
              
            console.log(`Updated sending status to 'entregue'`);
          } else {
            // Create a new record if one doesn't exist yet
            await supabaseClient
              .from('envios')
              .insert([{
                contato_id: contato_id,
                template_id: template_id,
                user_id: user_id,
                status: 'entregue',
                resposta_smtp: JSON.stringify(sendResult)
              }]);
              
            console.log(`Created new sending record with status 'entregue'`);
          }
        } catch (dbError) {
          console.error("Error updating database record:", dbError);
          // Continue execution even if DB update fails
        }
      }
      
      // Also update agendamento status if this is a scheduled email
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'enviado' })
            .eq('id', agendamento_id);
          
          console.log(`Updated agendamento status to 'enviado' for ID: ${agendamento_id}`);
        } catch (dbError) {
          console.error("Error updating agendamento status:", dbError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email enviado com sucesso!",
          provider: sendResult.provider,
          from: sendResult.from, // Include sender address in response
          reply_to: sendResult.reply_to, // Include reply-to address if available
          info: {
            messageId: sendResult.id
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      
      // Create a friendly error message
      let errorMessage = "Erro ao enviar email: " + (emailError.message || "Erro desconhecido");
      
      // Update agendamento for error case
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'falha' })
            .eq('id', agendamento_id);
        } catch (dbError) {
          console.error("Error updating agendamento status:", dbError);
        }
      }
      
      // Return appropriate error response
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Falha ao enviar email",
          error: errorMessage,
          provider: useSmtp ? "smtp" : "resend"
        }),
        { 
          status: 200, // Using 200 even for errors as requested
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Error in send-email function:", error);
    
    // Create a friendly error message
    const errorMessage = error.message || "Erro desconhecido ao enviar email";
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Erro ao processar requisição de email",
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, // Using 200 even for errors as requested
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
