
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";
import nodemailer from "https://cdn.skypack.dev/nodemailer@6.9.12";

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
      
      // Try to send via SMTP if configured
      if (useSmtp) {
        console.log("Sending email via user-configured SMTP");
        
        try {
          // Prepare the email
          const fromName = smtpConfig.nome || smtpConfig.user.split('@')[0];
          const fromEmail = smtpConfig.user;
          const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
          
          console.log(`Sending as: ${fromHeader}`);
          
          // Create SMTP transporter with nodemailer
          const transporter = nodemailer.createTransport({
            host: smtpConfig.server,
            port: smtpConfig.port,
            secure: smtpConfig.security === "ssl" || smtpConfig.port === 465,
            auth: {
              user: smtpConfig.user,
              pass: smtpConfig.password
            }
          });
          
          // Build the email options
          const mailOptions = {
            from: fromHeader,
            to: to,
            subject: subject,
            html: htmlContent,
            replyTo: fromEmail,
            headers: {
              'X-Mailer': 'DisparoPro',
              'Sender': fromEmail,
            }
          };
          
          if (cc && cc.length > 0) {
            mailOptions.cc = cc.join(', ');
          }
          
          if (bcc && bcc.length > 0) {
            mailOptions.bcc = bcc.join(', ');
          }
          
          // Add attachments if any
          if (processedAttachments.length > 0) {
            mailOptions.attachments = processedAttachments.map(attachment => ({
              filename: attachment.filename,
              content: Buffer.from(attachment.content, 'base64'),
              contentType: attachment.contentType
            }));
          }
          
          // Send the email with detailed logging
          console.log("Sending SMTP email with options:", {
            from: fromHeader,
            to: to,
            subject: subject
          });
          
          const info = await transporter.sendMail(mailOptions);
          
          console.log("Nodemailer SMTP response:", info);
          
          sendResult = {
            id: info.messageId || "SMTP-SENT", 
            provider: "smtp",
            success: true,
            from: fromEmail,
            envelope: info.envelope || {}
          };
          
        } catch (smtpError) {
          console.error("SMTP sending error:", smtpError);
          
          // Create more descriptive error message
          let errorMessage = "Falha ao enviar email via SMTP: " + smtpError.message;
          
          if (smtpError.message?.includes("authentication") || smtpError.message?.includes("auth")) {
            errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
            if (smtpConfig.server?.includes("gmail")) {
              errorMessage += " Para o Gmail, você pode precisar gerar uma senha de aplicativo.";
            }
          } else if (smtpError.message?.includes("timeout")) {
            errorMessage = "Tempo limite da conexão SMTP esgotado: Verifique se o servidor SMTP está acessível.";
          } else if (smtpError.message?.includes("certificate") || smtpError.message?.includes("TLS")) {
            errorMessage = "Erro de certificado SSL/TLS: Verifique suas configurações de segurança.";
          } else if (smtpError.message?.includes("connect") || smtpError.message?.includes("network")) {
            errorMessage = "Falha ao conectar ao servidor SMTP: Verifique seu endereço e porta.";
          } else if (smtpError.message?.includes("Bad resource")) {
            errorMessage = "Erro de recurso de conexão segura: Verifique suas configurações de segurança.";
          }
          
          // Try with Resend as fallback if available and only if it wasn't already a Resend test
          if (resendApiKey && !isTest) {
            console.log("SMTP failed, trying with Resend as fallback...");
          } else {
            // No Resend fallback, report SMTP error
            throw new Error(errorMessage);
          }
        }
      }
      
      // If SMTP is not configured or failed and we have Resend available
      if (!sendResult && resendApiKey) {
        console.log("Sending email with Resend API", useSmtp ? "(fallback)" : "(default)");
        
        const resend = new Resend(resendApiKey);

        // Determine the email and name for Resend
        const fromName = smtpConfig.nome || emailConfig.smtp_nome || 'DisparoPro';
        
        // For Resend, we use the default verified sender but set reply-to to the user's email
        const userEmail = smtpConfig.user || emailConfig.email_usuario;
        const fromEmail = "onboarding@resend.dev"; // Always use the verified sender
        const replyToEmail = userEmail;
        
        console.log(`Sending with Resend as: ${fromName} <${fromEmail}> with reply-to: ${replyToEmail}`);
        
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
        
        console.log("Email data prepared for Resend:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          reply_to: emailData.reply_to || "not defined"
        }));

        try {
          const result = await resend.emails.send(emailData);
          console.log("Resend response:", result);
          
          if (!result) {
            throw new Error("Invalid response from email service");
          }
          
          if (result.error) {
            throw new Error(result.error.message || "Unknown error sending email");
          }
          
          console.log("Email sent successfully via Resend. ID:", result.id);
          
          sendResult = {
            id: result.id,
            provider: "resend",
            success: true,
            from: fromEmail,
            reply_to: emailData.reply_to
          };
        } catch (resendError) {
          console.error("Resend API error:", resendError);
          throw resendError;
        }
      } else if (!sendResult) {
        // We have neither SMTP nor Resend configured
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
