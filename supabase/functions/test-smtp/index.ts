
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestSmtpRequest {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_security: string;
  use_resend: boolean;
  smtp_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract request data
    const requestData: TestSmtpRequest = await req.json();
    const { 
      smtp_server, 
      smtp_port, 
      smtp_user, 
      smtp_password, 
      smtp_security, 
      use_resend,
      smtp_name 
    } = requestData;
    
    // Check if we have a valid email to send to
    if (!smtp_user || !smtp_user.includes('@')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email inválido"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Basic check to prevent spam through this endpoint
    const email = smtp_user.trim().toLowerCase();
    
    // Construir conteúdo HTML para email de teste
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
          <h2 style="color: #333;">Teste de Email do DisparoPro</h2>
          <p>Olá,</p>
          <p>Este é um email de teste enviado pelo DisparoPro para verificar suas configurações de email.</p>
          <p>Seu email foi configurado corretamente!</p>
          <p>Método de envio: ${use_resend ? 'Serviço Resend' : 'SMTP Direto'}</p>
          <p style="margin-top: 20px;">Atenciosamente,<br>Equipe DisparoPro</p>
        </div>
      </div>
    `;
    
    // Preparar dados para envio
    const fromName = smtp_name || "DisparoPro";
    
    // Se o usuário escolheu usar SMTP e forneceu as credenciais necessárias
    if (!use_resend && smtp_server && smtp_port && smtp_user && smtp_password) {
      try {
        console.log(`Testando conexão SMTP: ${smtp_server}:${smtp_port}`);
        
        // Configurar cliente SMTP
        const client = new SmtpClient();
        
        // Conectar ao servidor SMTP
        await client.connectTLS({
          hostname: smtp_server,
          port: smtp_port,
          username: smtp_user,
          password: smtp_password,
        });
        
        // Enviar email
        await client.send({
          from: `${fromName} <${smtp_user}>`,
          to: email,
          subject: "Teste de Email do DisparoPro",
          content: "text/html",
          html: htmlContent,
        });
        
        // Fechar conexão
        await client.close();
        
        console.log("Email de teste enviado com sucesso via SMTP");
        
        // Retornar sucesso
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email de teste enviado com sucesso via SMTP!",
            details: {
              provider: "smtp",
              server: smtp_server,
              port: smtp_port
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (smtpError) {
        console.error("Erro SMTP:", smtpError);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro de conexão SMTP: ${smtpError.message || "Verifique suas credenciais e configurações do servidor"}`,
            error: smtpError.message
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Usar Resend como fallback ou se escolhido pelo usuário
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "API do Resend não configurada no servidor"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      const resend = new Resend(resendApiKey);
      const fromEmail = "onboarding@resend.dev"; // Email verificado pelo Resend
      
      // Enviar email de teste
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: "Teste de Email do DisparoPro",
        html: htmlContent,
        reply_to: email // Usar o email do usuário como responder-para
      });
      
      if (result.error) {
        console.error("Erro ao enviar email de teste:", result.error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro ao enviar email: ${result.error.message}`
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Retornar sucesso
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email de teste enviado com sucesso pelo Resend!",
          details: {
            provider: "resend",
            id: result.id,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Erro no teste SMTP:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erro ao testar configurações: ${error.message || "Erro desconhecido"}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
