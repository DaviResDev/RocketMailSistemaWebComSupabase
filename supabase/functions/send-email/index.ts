
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
    
    // Log environment variables (sem revelar chaves completas)
    console.log("SUPABASE_URL disponível:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY disponível:", !!supabaseServiceKey);
    console.log("RESEND_API_KEY disponível:", !!resendApiKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Variáveis de ambiente ausentes: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Erro de configuração do servidor",
          error: "Erro de configuração do servidor: Credenciais Supabase ausentes" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validar request
    let requestData: EmailRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Erro ao analisar JSON do request:", parseError);
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
    
    // Validar dados antes de prosseguir
    if (!to || !subject || !content || !user_id) {
      console.error("Dados de requisição incompletos:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Dados incompletos para envio de email",
          error: "Dados obrigatórios ausentes: destinatário, assunto, conteúdo ou ID do usuário" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validar formato de email do destinatário
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
    
    // Obter configurações do banco de dados para o usuário especificado
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle(); // Usando maybeSingle para evitar erros quando não há configurações

    if (settingsError) {
      console.error("Erro ao buscar configurações:", settingsError);
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
      console.error("Configurações de email não encontradas para o usuário:", user_id);
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
    console.log("Configuração de email:", JSON.stringify({
      use_smtp: emailConfig.use_smtp,
      email_smtp: emailConfig.email_smtp ? "configurado" : "não configurado",
      smtp_nome: emailConfig.smtp_nome || "não definido"
    }));
    
    // Verificar configurações de SMTP
    const smtpConfig: SmtpConfig = {
      server: emailConfig.email_smtp,
      port: emailConfig.email_porta,
      user: emailConfig.email_usuario,
      password: emailConfig.email_senha,
      security: emailConfig.smtp_seguranca || 'tls',
      nome: emailConfig.smtp_nome || '',
      use_smtp: Boolean(emailConfig.use_smtp)
    };
    
    // Verificar se todos os campos necessários para SMTP estão presentes
    const useSmtp = smtpConfig.use_smtp && 
                    smtpConfig.server && 
                    smtpConfig.port && 
                    smtpConfig.user && 
                    smtpConfig.password;
    
    console.log("Usando SMTP:", useSmtp);
    
    // Gerar assinatura com area_negocio se disponível
    let assinatura = "";
    if (emailConfig.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${emailConfig.email_usuario || ''}</div>`;

    // Criar conteúdo HTML do email com conteúdo personalizado
    // Substituir placeholders com dados reais se não for um email de teste
    let processedContent = content;
    
    // Se não for um email de teste, tenta obter informações de contato para personalização
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
        console.error("Erro ao buscar dados do contato para personalização:", error);
        // Continuar sem personalização se houver um erro
      }
    }
    
    // Substituir placeholders de data
    const currentDate = new Date();
    processedContent = processedContent
      .replace(/{dia}/g, currentDate.toLocaleDateString('pt-BR'));

    // Criar conteúdo HTML final
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
      // Processar anexos se houver
      const processedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        console.log(`Processando ${attachments.length} anexos`);
        
        for (const attachment of attachments) {
          try {
            processedAttachments.push({
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            });
            
            console.log(`Anexo processado: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Erro ao processar anexo ${attachment.filename}:`, attachError);
          }
        }
      }

      let sendResult;
      
      // Tentar enviar via SMTP se configurado
      if (useSmtp) {
        console.log("Enviando email via SMTP configurado pelo usuário");
        
        try {
          // Determinar se deve usar conexão segura
          const secure = smtpConfig.security === "ssl" || Number(smtpConfig.port) === 465;
          console.log(`Usando conexão SMTP ${secure ? 'SSL/TLS direta' : 'com STARTTLS'} para ${smtpConfig.server}:${smtpConfig.port}`);
          
          // Criar cliente SMTP com timeout adequado e debug ativado
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
            debug: true, // Ativar debug para melhor depuração
          });

          // Preparar o email
          const fromName = smtpConfig.nome ? `"${smtpConfig.nome}" <${smtpConfig.user}>` : smtpConfig.user;
          
          const emailData: any = {
            from: fromName,
            to: [to],
            subject: subject,
            html: htmlContent,
          };
          
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
        } catch (smtpError) {
          console.error("Erro no envio SMTP:", smtpError);
          
          // Criar mensagem de erro mais descritiva
          let errorMessage = "Falha ao enviar email via SMTP: " + smtpError.message;
          
          if (smtpError.message?.includes("authentication")) {
            errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
            if (smtpConfig.server?.includes("gmail")) {
              errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo.";
            }
          } else if (smtpError.message?.includes("timeout")) {
            errorMessage = "Timeout na conexão SMTP: Verifique se o servidor SMTP está acessível.";
          } else if (smtpError.message?.includes("certificate") || smtpError.message?.includes("TLS")) {
            errorMessage = "Erro de certificado SSL/TLS: Verifique as configurações de segurança.";
          } else if (smtpError.message?.includes("connect") || smtpError.message?.includes("network")) {
            errorMessage = "Falha ao conectar ao servidor SMTP: Verifique o endereço e porta.";
          } else if (smtpError.message?.includes("Bad resource")) {
            errorMessage = "Erro de recurso na conexão segura: Verifique as configurações de segurança.";
          }
          
          // Tenta com Resend como fallback se disponível
          if (resendApiKey) {
            console.log("SMTP falhou, tentando com Resend como fallback...");
          } else {
            // Sem Resend como fallback, reportar erro SMTP
            throw new Error(errorMessage);
          }
        }
      }
      
      // Se SMTP não está configurado ou falhou e temos Resend disponível
      if (!sendResult && resendApiKey) {
        console.log("Enviando email com Resend API", useSmtp ? "(fallback)" : "(padrão)");
        
        const resend = new Resend(resendApiKey);

        // Determinar o email do remetente
        const fromEmail = 'onboarding@resend.dev';
        const fromName = smtpConfig.nome || 'DisparoPro';
        
        console.log(`Enviando como: ${fromName} <${fromEmail}>`);
        
        // Preparar dados de email para Resend
        const emailData: any = {
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
          emailData.attachments = processedAttachments.map(attachment => ({
            filename: attachment.filename,
            content: attachment.content // Resend espera o conteúdo como string base64
          }));
        }

        console.log("Dados de email preparados para Resend:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          reply_to: emailData.reply_to
        }));

        try {
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
            success: true
          };
        } catch (resendError) {
          console.error("Erro na API do Resend:", resendError);
          throw resendError;
        }
      } else if (!sendResult) {
        // Não temos SMTP nem Resend configurados
        throw new Error("Nenhum método de envio de email disponível. Configure SMTP ou adicione API key do Resend.");
      }
      
      // Email enviado com sucesso - Atualizar status se necessário
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
          provider: sendResult.provider,
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
          success: false,
          message: "Falha ao enviar email",
          error: errorMessage,
          provider: useSmtp ? "smtp" : "resend"
        }),
        { 
          status: 200, // Usando 200 mesmo para erro, conforme solicitado
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Erro na função send-email:", error);
    
    // Criar uma mensagem de erro amigável
    const errorMessage = error.message || "Erro desconhecido ao enviar email";
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Erro ao processar solicitação de email",
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, // Usando 200 mesmo para erro, conforme solicitado
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
