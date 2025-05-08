
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
      throw new Error("Erro de configuração do servidor");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments, isTest, agendamento_id } = requestData as EmailRequest;
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ error: "Dados incompletos para envio de email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Preparing to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    
    // Get settings from database for the specified user
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('user_id', user_id)
      .limit(1);
      
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar configurações de email: " + settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!settingsData || settingsData.length === 0) {
      console.error("No email settings found for user:", user_id);
      return new Response(
        JSON.stringify({ error: "Configurações de email não encontradas." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const emailConfig = settingsData[0];
    
    // Verifica se o usuário tem configurações de SMTP e quer usá-las
    const smtpConfig: SmtpConfig = {
      server: emailConfig.email_smtp,
      port: emailConfig.email_porta,
      user: emailConfig.email_usuario,
      password: emailConfig.email_senha,
      security: emailConfig.smtp_seguranca || 'tls',
      nome: emailConfig.smtp_nome || '',
      use_smtp: Boolean(emailConfig.use_smtp) // Novo campo para controlar se usa SMTP ou Resend
    };
    
    const useSmtp = smtpConfig.use_smtp && 
                    smtpConfig.server && 
                    smtpConfig.port && 
                    smtpConfig.user && 
                    smtpConfig.password;
    
    // Generate signature with area_negocio if available
    let assinatura = "";
    if (emailConfig.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${emailConfig.email_usuario || ''}</div>`;

    // Create email HTML content with personalized content
    // Replace placeholders with real data if not a test email
    let processedContent = content;
    
    // If it's not a test email, try to get contact information for personalization
    if (!isTest && contato_id) {
      try {
        const { data: contatoData } = await supabaseClient
          .from('contatos')
          .select('*')
          .eq('id', contato_id)
          .single();
          
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
          ${assinatura}
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
            });
            
            console.log(`Attachment processed: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }
      }

      let sendResult;
      
      // Tentar enviar via SMTP se configurado, caso contrário usar Resend
      if (useSmtp) {
        console.log("Enviando email via SMTP configurado pelo usuário");
        
        try {
          // Determinar se deve usar conexão segura
          const secure = smtpConfig.security === "ssl" || Number(smtpConfig.port) === 465;
          console.log(`Usando conexão SMTP ${secure ? 'SSL/TLS' : 'STARTTLS'} para ${smtpConfig.server}:${smtpConfig.port}`);
          
          // Criar cliente SMTP
          const client = new SMTPClient({
            connection: {
              hostname: smtpConfig.server,
              port: Number(smtpConfig.port),
              auth: {
                username: smtpConfig.user,
                password: smtpConfig.password,
              },
              tls: secure,
              timeout: 30000, // 30 segundos timeout
            },
          });

          // Preparar o email
          const emailData: any = {
            from: smtpConfig.user,
            to: [to],
            subject: subject,
            html: htmlContent,
          };
          
          if (smtpConfig.nome) {
            emailData.from = `"${smtpConfig.nome}" <${smtpConfig.user}>`;
          }
          
          // Adicionar CC se fornecido
          if (cc && cc.length > 0) {
            emailData.cc = cc;
          }
          
          // Adicionar BCC se fornecido
          if (bcc && bcc.length > 0) {
            emailData.bcc = bcc;
          }
          
          // Adicionar anexos se existirem
          if (processedAttachments.length > 0) {
            emailData.attachments = processedAttachments;
          }

          console.log("Enviando email via SMTP:", emailData.from, "->", emailData.to, "Subject:", emailData.subject);

          // Enviar o email
          const result = await client.send(emailData);
          
          console.log("Email enviado via SMTP com sucesso:", result);
          
          // Fechar a conexão
          await client.close();
          
          sendResult = {
            id: result.id || "SMTP-SENT", 
            provider: "smtp",
            success: true
          };
        } catch (smtpError: any) {
          console.error("Erro no envio SMTP:", smtpError);
          
          // Tenta com Resend como fallback se disponível
          if (resendApiKey) {
            console.log("SMTP falhou, tentando com Resend como fallback...");
            // Continua para o bloco Resend abaixo
          } else {
            // Não temos Resend como fallback, reportar erro SMTP
            let errorMessage = "Falha ao enviar email via SMTP: " + smtpError.message;
            
            if (smtpError.message?.includes("authentication")) {
              errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
              if (smtpConfig.server?.includes("gmail")) {
                errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo.";
              }
            } else if (smtpError.message?.includes("timeout")) {
              errorMessage = "Timeout na conexão SMTP: Verifique se o servidor SMTP está acessível.";
            } else if (smtpError.message?.includes("certificate")) {
              errorMessage = "Erro de certificado SSL: Verifique as configurações de segurança.";
            } else if (smtpError.message?.includes("connect")) {
              errorMessage = "Falha ao conectar ao servidor SMTP: Verifique o endereço e porta.";
            }
            
            throw new Error(errorMessage);
          }
        }
      }
      
      // Se SMTP não está configurado ou falhou e temos Resend disponível, use Resend
      if (!sendResult && resendApiKey) {
        console.log("Enviando email com Resend API", useSmtp ? "(fallback)" : "(padrão)");
        
        const resend = new Resend(resendApiKey);

        // Usar onboarding@resend.dev como remetente para testes
        // Isso é garantido funcionar com qualquer chave da Resend
        const fromEmail = 'onboarding@resend.dev';
        const fromName = smtpConfig.nome || 'DisparoPro';
        
        console.log(`Enviando como: ${fromName} <${fromEmail}>`);
        
        // Preparar dados de email para Resend
        const emailData = {
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlContent,
          reply_to: smtpConfig.user || fromEmail,
        };
        
        // Adicionar destinatários em CC se fornecidos
        if (cc && cc.length > 0) {
          emailData.cc = cc;
        }
        
        // Adicionar destinatários em BCC se fornecidos
        if (bcc && bcc.length > 0) {
          emailData.bcc = bcc;
        }
        
        // Adicionar anexos se houver
        if (processedAttachments.length > 0) {
          emailData.attachments = processedAttachments;
        }

        console.log("Dados de email preparados para Resend:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          reply_to: emailData.reply_to
        }));

        // Enviar o email usando Resend com tratamento adequado de erros
        try {
          const result = await resend.emails.send(emailData);
          console.log("Resposta do Resend:", result);
          
          // Verificar validade da resposta
          if (!result) {
            throw new Error("Resposta inválida do serviço de email");
          }
          
          if (result.error) {
            throw new Error(result.error.message || "Erro desconhecido ao enviar email");
          }
          
          // Caso de sucesso
          console.log("Email enviado com sucesso via Resend. ID:", result.id);
          
          sendResult = {
            id: result.id,
            provider: "resend",
            success: true
          };
        } catch (resendError: any) {
          console.error("Erro na API do Resend:", resendError);
          throw resendError;
        }
      } else if (!sendResult) {
        // Não temos SMTP nem Resend configurados
        throw new Error("Nenhum método de envio de email disponível. Configure SMTP ou adicione API key do Resend.");
      }
      
      // Email enviado com sucesso (seja via SMTP ou Resend)
      // Atualizar status do envio se IDs relevantes forem fornecidos
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
              
            console.log(`Atualizado status do envio para 'entregue'`);
          } else {
            // Criar um novo registro se ainda não existir
            await supabaseClient
              .from('envios')
              .insert([{
                contato_id: contato_id,
                template_id: template_id,
                user_id: user_id,
                status: 'entregue',
                resposta_smtp: JSON.stringify(sendResult)
              }]);
              
            console.log(`Criado novo registro de envio com status 'entregue'`);
          }
        } catch (dbError) {
          console.error("Erro ao atualizar registro no banco de dados:", dbError);
          // Continuar execução mesmo se a atualização do DB falhar
        }
      }
      
      // Também atualizar o status do agendamento se este for de um email agendado
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'enviado' })
            .eq('id', agendamento_id);
          
          console.log(`Atualizado status do agendamento para 'enviado' para ID: ${agendamento_id}`);
        } catch (dbError) {
          console.error("Erro ao atualizar status do agendamento:", dbError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email enviado com sucesso!",
          id: sendResult.id,
          provider: sendResult.provider
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (emailError: any) {
      console.error("Erro no envio de email:", emailError);
      
      // Criar uma mensagem de erro amigável
      let errorMessage = "Erro ao enviar email: " + (emailError.message || "Erro desconhecido");
      
      // Atualizar agendamento para caso de erro
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'falha' })
            .eq('id', agendamento_id);
        } catch (dbError) {
          console.error("Erro ao atualizar status do agendamento:", dbError);
        }
      }
      
      // Retornar resposta de erro apropriada
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: "Falha ao enviar email"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error: any) {
    console.error("Erro na função send-email:", error);
    
    // Criar uma mensagem de erro amigável
    const errorMessage = error.message || "Erro desconhecido ao enviar email";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
