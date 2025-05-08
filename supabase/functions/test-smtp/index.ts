
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { 
      smtp_server, 
      smtp_port, 
      smtp_user, 
      smtp_password, 
      smtp_security,
      use_resend = false
    } = await req.json();

    // Validar parâmetros antes de prosseguir
    if (use_resend) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error("API key do Resend não configurada no sistema");
      }
      
      console.log("Testando conexão com Resend API");
      
      try {
        const resend = new Resend(resendApiKey);
        
        // Teste com um simples envio via Resend
        const result = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: smtp_user, // Enviar teste para o próprio usuário
          subject: "Teste de Conexão Resend",
          html: "<p>Este é um email de teste do DisparoPro para verificar a conexão com Resend.</p>"
        });
        
        if (result.error) {
          throw new Error(`Falha na API Resend: ${result.error.message}`);
        }
        
        console.log("Teste Resend bem-sucedido:", result);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Conexão com Resend testada com sucesso!",
            provider: "resend",
            info: {
              messageId: result.id
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } catch (resendError) {
        console.error("Erro Resend:", resendError);
        throw new Error(`Erro ao conectar com Resend: ${resendError.message}`);
      }
    } else {
      // Modo SMTP
      if (!smtp_server || !smtp_port || !smtp_user || !smtp_password) {
        throw new Error("Parâmetros SMTP incompletos. Por favor, preencha servidor, porta, usuário e senha.");
      }
      
      // Validar formato do email
      if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(smtp_user)) {
        throw new Error("Formato de email inválido para o usuário SMTP");
      }
      
      // Validar porta como número
      if (isNaN(Number(smtp_port)) || Number(smtp_port) <= 0 || Number(smtp_port) > 65535) {
        throw new Error("A porta SMTP deve ser um número válido entre 1 e 65535");
      }

      console.log("Testando conexão SMTP para:", smtp_server, smtp_port);
      console.log("Com usuário:", smtp_user);
      console.log("Segurança:", smtp_security || "tls");
      
      try {
        // Determinar se devemos usar conexão segura
        const secure = smtp_security === "ssl" || Number(smtp_port) === 465;
        console.log(`Usando conexão ${secure ? 'SSL/TLS' : 'STARTTLS se disponível'}`);
        
        // Criar cliente SMTP com biblioteca denomailer
        const client = new SMTPClient({
          connection: {
            hostname: smtp_server,
            port: Number(smtp_port),
            auth: {
              username: smtp_user,
              password: smtp_password,
            },
            tls: secure,
            timeout: 30000, // 30 segundos de timeout
          },
        });

        console.log("Cliente SMTP criado, tentando enviar um email de teste");
        
        // Testar com uma operação simples de envio
        const result = await client.send({
          from: smtp_user,
          to: smtp_user, // Enviar teste para o próprio usuário
          subject: "Teste SMTP DisparoPro",
          content: "Este é um email de teste para verificar suas configurações SMTP"
        });
        
        console.log("Teste SMTP bem-sucedido:", result);
        
        // Fechar a conexão
        await client.close();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Conexão SMTP testada com sucesso!",
            provider: "smtp",
            info: {
              messageId: result.id || "SMTP-TEST"
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } catch (smtpError: any) {
        console.error("Erro SMTP:", smtpError);
        
        // Adicionar mensagens de erro detalhadas para problemas comuns de SMTP
        let errorMessage = `Teste de conexão SMTP falhou: ${smtpError.message}`;
        
        if (smtpError.message?.includes("authentication")) {
          errorMessage = "Falha na autenticação SMTP: Verifique seu nome de usuário e senha.";
          if (smtp_server?.includes("gmail")) {
            errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo em https://myaccount.google.com/apppasswords";
          }
        } else if (smtpError.message?.includes("timeout")) {
          errorMessage = "Timeout na conexão SMTP: Verifique se o servidor SMTP está acessível e se a porta está correta.";
        } else if (smtpError.message?.includes("certificate")) {
          errorMessage = "Erro de certificado SSL: O servidor SMTP pode não estar configurado corretamente para SSL/TLS.";
        } else if (smtpError.message?.includes("connect")) {
          errorMessage = "Falha ao conectar ao servidor SMTP: Verifique o endereço e a porta do servidor.";
        }
        
        throw new Error(errorMessage);
      }
    }
  } catch (error: any) {
    console.error("Erro na função test-smtp:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
