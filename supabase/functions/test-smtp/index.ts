
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpConfig {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_security: string;
  use_resend: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Parsear o corpo da requisição
    let data: SmtpConfig;
    try {
      data = await req.json();
    } catch (error) {
      console.error("Erro ao analisar o corpo da requisição:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Formato de requisição inválido",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Testando configurações:", {
      use_resend: data.use_resend,
      smtp_server: data.smtp_server ? "configurado" : "não configurado",
      smtp_user: data.smtp_user ? "configurado" : "não configurado",
    });

    // Adicionar validações básicas
    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Dados ausentes na requisição",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se use_resend estiver definido como true, testar o Resend
    if (data.use_resend) {
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "API key do Resend não configurada no servidor",
            provider: "resend"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      try {
        const resend = new Resend(resendApiKey);
        
        // Definir o nome do remetente como "Teste DisparoPro" e o email como o email do usuário
        const fromName = "Teste DisparoPro";
        
        // Usar email do usuário como remetente (isso requer domínio verificado no Resend)
        // Se o domínio não estiver verificado, isso falhará e a mensagem de erro ajudará o usuário
        const fromEmail = data.smtp_user; 
        
        console.log(`Testando Resend com from: ${fromName} <${fromEmail}>`);
        
        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [data.smtp_user],
          subject: "Teste de conexão DisparoPro",
          html: "<h1>Teste de email via Resend</h1><p>Esta é uma mensagem de teste para verificar a integração do Resend com o DisparoPro.</p>"
        });
        
        if (result.error) {
          // Se o erro for relacionado à verificação de domínio, fornecer uma mensagem mais clara
          if (result.error.message?.includes('domain') || result.error.message?.includes('verify')) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Você precisa verificar seu domínio de email no Resend antes de usar seu próprio email como remetente. Acesse https://resend.com/domains para verificar seu domínio.",
                provider: "resend",
                error: result.error
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(result.error.message);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Teste de conexão com Resend bem-sucedido!",
            provider: "resend",
            info: {
              messageId: result.id,
              from: fromEmail
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Erro ao testar Resend:", error);
        
        // Verificar se o erro é relacionado à verificação de domínio
        const errorMsg = error.message || "";
        if (errorMsg.includes('domain') || errorMsg.includes('verify')) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Você precisa verificar seu domínio de email no Resend antes de usar seu próprio email como remetente. Acesse https://resend.com/domains para verificar seu domínio.",
              provider: "resend"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro ao testar Resend: ${error.message}`,
            provider: "resend"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Teste SMTP
      if (!data.smtp_server || !data.smtp_port || !data.smtp_user || !data.smtp_password) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Configurações SMTP incompletas",
            provider: "smtp"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const client = new SmtpClient();
        
        // Configurar a conexão SMTP
        const secure = data.smtp_security === "ssl" || data.smtp_port === 465;
        console.log(`Testando conexão SMTP ${secure ? 'segura (SSL/TLS)' : 'com STARTTLS'}`);
        
        await client.connectTLS({
          hostname: data.smtp_server,
          port: data.smtp_port,
          username: data.smtp_user,
          password: data.smtp_password,
          tls: secure
        });
        
        // Enviar um email de teste
        const fromName = "Teste DisparoPro";
        const fromEmail = data.smtp_user; // Usar o email do usuário como remetente
        
        console.log(`Enviando email de teste como: ${fromName} <${fromEmail}>`);
        
        const sendId = await client.send({
          from: `${fromName} <${fromEmail}>`,
          to: data.smtp_user, // Enviar para o próprio usuário
          subject: "Teste de conexão SMTP DisparoPro",
          content: "text/html",
          html: "<h1>Teste de email via SMTP</h1><p>Esta é uma mensagem de teste para verificar suas configurações SMTP no DisparoPro.</p>",
        });
        
        await client.close();

        return new Response(
          JSON.stringify({
            success: true,
            message: "Teste de conexão SMTP bem-sucedido!",
            provider: "smtp",
            info: {
              messageId: sendId || "SMTP-TEST-OK",
              from: fromEmail
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Erro ao testar SMTP:", error);
        
        // Criar mensagem de erro mais descritiva
        let errorMessage = "Falha na conexão SMTP: " + error.message;
        
        if (error.message?.includes("authentication") || error.message?.includes("auth")) {
          errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
          if (data.smtp_server?.includes("gmail")) {
            errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo.";
          }
        } else if (error.message?.includes("timeout")) {
          errorMessage = "Timeout na conexão SMTP: Verifique se o servidor SMTP está acessível.";
        } else if (error.message?.includes("certificate") || error.message?.includes("TLS")) {
          errorMessage = "Erro de certificado SSL/TLS: Verifique as configurações de segurança.";
        } else if (error.message?.includes("connect") || error.message?.includes("network")) {
          errorMessage = "Falha ao conectar ao servidor SMTP: Verifique o endereço e porta.";
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: errorMessage,
            provider: "smtp"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error) {
    console.error("Erro geral no teste de conexão:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erro ao testar conexão: ${error.message}`,
        provider: "unknown"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
