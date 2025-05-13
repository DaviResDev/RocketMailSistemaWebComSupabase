
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0';

// Import the email sender functions correctly - named imports instead of default import
import { sendEmailViaSMTP, sendEmailViaResend } from '../lib/email-sender.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    name?: string;
  };
  testEmail?: string;
  use_smtp?: boolean;
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const requestData = await req.json() as RequestBody;
    const { config, testEmail, use_smtp = true } = requestData;
    
    // Fix port if it's a common error (584 instead of 587)
    if (config.port === 584) {
      console.log("Port 584 detected, correcting to 587 (standard SMTP port with TLS)");
      config.port = 587;
    }

    console.log("Testing with configuration:", {
      host: config.host,
      port: config.port,
      secure: config.secure || config.port === 465,
      user: config.user ? "provided" : "not provided",
      pass: config.pass ? "provided" : "not provided", 
      name: config.name || 'DisparoPro',
      testEmail
    });
    
    if (!config.user || !config.pass) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing email credentials" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const recipientEmail = testEmail || config.user;
    
    try {
      const htmlContent = `
        <h1>Teste de Configuração SMTP</h1>
        <p>Seu servidor SMTP foi configurado com sucesso!</p>
        <p>Detalhes da configuração:</p>
        <ul>
          <li><strong>Servidor:</strong> ${config.host}</li>
          <li><strong>Porta:</strong> ${config.port}</li>
          <li><strong>Segurança:</strong> ${config.secure ? 'SSL/TLS' : 'STARTTLS'}</li>
          <li><strong>Usuário:</strong> ${config.user}</li>
          <li><strong>Nome do Remetente:</strong> ${config.name || 'DisparoPro'}</li>
        </ul>
        <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
      `;
      
      let result;
      
      if (use_smtp) {
        // Test SMTP configuration
        result = await sendEmailViaSMTP(
          {
            host: config.host,
            port: config.port,
            secure: config.secure || config.port === 465,
            user: config.user,
            pass: config.pass,
            name: config.name || 'DisparoPro'
          },
          {
            to: recipientEmail,
            subject: "Teste de configuração SMTP - DisparoPro",
            html: htmlContent
          }
        );
      } else if (resendApiKey) {
        // Fallback to Resend if SMTP is not being used
        result = await sendEmailViaResend(
          resendApiKey,
          config.name || 'DisparoPro',
          config.user,
          {
            to: recipientEmail,
            subject: "Teste de configuração de email - DisparoPro",
            html: htmlContent
          }
        );
      } else {
        throw new Error("No email sending method available");
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email de teste enviado com sucesso!",
          details: {
            recipient: recipientEmail,
            messageId: result.id,
            provider: result.provider,
            from: result.from,
            transport: 'nodemailer'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error sending test email:", error);
      
      // Try to provide a more user-friendly error message
      let errorMessage = error.message;
      
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Não foi possível conectar ao servidor SMTP ${config.host}:${config.port}. Verifique se o servidor está correto e acessível.`;
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = `Tempo esgotado ao conectar ao servidor SMTP ${config.host}:${config.port}. Verifique sua conexão ou as configurações do firewall.`;
      } else if (error.message.includes('Invalid login')) {
        errorMessage = 'Login inválido. Verifique seu nome de usuário e senha.';
      } else if (error.message.includes('certificate')) {
        errorMessage = 'Problema com o certificado SSL do servidor. Tente desativar a opção "Seguro" se estiver usando a porta 587.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Falha no teste SMTP",
          error: errorMessage,
          details: {
            host: config.host,
            port: config.port,
            user: config.user
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("General error in test-smtp function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Erro ao testar configuração SMTP",
        error: error.message || "Erro desconhecido"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
