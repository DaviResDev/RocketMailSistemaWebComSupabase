
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";
import nodemailer from "https://cdn.skypack.dev/nodemailer@6.9.12";

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
    
    // Parse request body
    let data: SmtpConfig;
    try {
      data = await req.json();
    } catch (error) {
      console.error("Error parsing request JSON:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Formato de requisição inválido",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Testing configurations:", {
      use_resend: data.use_resend,
      smtp_server: data.smtp_server ? "configured" : "not configured",
      smtp_user: data.smtp_user ? "configured" : "not configured",
    });

    // Add basic validations
    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Dados faltando na requisição",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If use_resend is set to true, test Resend
    if (data.use_resend) {
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Chave API Resend não configurada no servidor",
            provider: "resend"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      try {
        const resend = new Resend(resendApiKey);
        
        // Set sender name as "DisparoPro Test" and use user's email
        const fromName = "Teste DisparoPro";
        
        // For testing, we'll use onboarding@resend.dev as sender and set reply-to as user's email
        // This ensures the test email will be delivered even if domain is not verified
        const fromEmail = "onboarding@resend.dev";
        
        console.log(`Testing Resend with from: ${fromName} <${fromEmail}> and reply-to: ${data.smtp_user}`);
        
        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [data.smtp_user],
          reply_to: data.smtp_user,
          subject: "DisparoPro - Teste de Conexão",
          html: "<h1>Teste de email via Resend</h1><p>Esta é uma mensagem de teste para verificar sua integração Resend com o DisparoPro.</p><p>Se você recebeu esta mensagem, sua configuração de email está funcionando corretamente!</p>"
        });
        
        if (result.error) {
          throw new Error(result.error.message || "Erro desconhecido do Resend");
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Teste de conexão Resend bem-sucedido! Verifique sua caixa de entrada para o email de teste.",
            provider: "resend",
            info: {
              messageId: result.id,
              from: fromEmail,
              reply_to: data.smtp_user
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error testing Resend:", error);
        
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
      // SMTP Test
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
        // Create nodemailer transporter for SMTP testing
        const transporter = nodemailer.createTransport({
          host: data.smtp_server,
          port: data.smtp_port,
          secure: data.smtp_security === "ssl" || data.smtp_port === 465,
          auth: {
            user: data.smtp_user,
            pass: data.smtp_password
          }
        });
        
        // Set up email data
        const fromName = "Teste DisparoPro";
        const fromEmail = data.smtp_user;
        const fromHeader = `${fromName} <${fromEmail}>`;
        
        console.log(`Sending test email as: ${fromHeader}`);
        
        // Send a test email
        const info = await transporter.sendMail({
          from: fromHeader,
          to: data.smtp_user,
          subject: "DisparoPro - Teste de Conexão SMTP",
          html: "<h1>Teste de email via SMTP</h1><p>Esta é uma mensagem de teste para verificar suas configurações SMTP no DisparoPro.</p><p>Se você recebeu esta mensagem, sua configuração de email está funcionando corretamente!</p>",
          headers: {
            'X-Mailer': 'DisparoPro Test',
            'Sender': fromEmail
          }
        });

        console.log("SMTP test info:", info);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Teste de conexão SMTP bem-sucedido! Verifique sua caixa de entrada para o email de teste.",
            provider: "smtp",
            info: {
              messageId: info.messageId || "SMTP-TEST-OK",
              from: fromEmail,
              response: info.response
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } catch (error) {
        console.error("Error testing SMTP:", error);
        
        // Create more descriptive error message
        let errorMessage = "Falha na conexão SMTP: " + error.message;
        
        if (error.message?.includes("authentication") || error.message?.includes("auth")) {
          errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
          if (data.smtp_server?.includes("gmail")) {
            errorMessage += " Para o Gmail, você pode precisar gerar uma senha de aplicativo.";
          }
        } else if (error.message?.includes("timeout")) {
          errorMessage = "Tempo limite de conexão SMTP esgotado: Verifique se o servidor SMTP está acessível.";
        } else if (error.message?.includes("certificate") || error.message?.includes("TLS")) {
          errorMessage = "Erro de certificado SSL/TLS: Verifique suas configurações de segurança.";
        } else if (error.message?.includes("connect") || error.message?.includes("network")) {
          errorMessage = "Falha ao conectar ao servidor SMTP: Verifique seu endereço de servidor e porta.";
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
    console.error("General error in connection test:", error);
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
