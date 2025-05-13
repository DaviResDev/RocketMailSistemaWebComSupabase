
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";
import nodemailer from "https://esm.sh/nodemailer@6.9.12";

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
    
    console.log("Received test request with data:", {
      server: smtp_server,
      port: smtp_port,
      user: smtp_user ? smtp_user.substring(0, 3) + "***" : "not provided",
      security: smtp_security,
      use_resend: use_resend,
      name: smtp_name
    });
    
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
          <p>Método de envio: ${use_resend ? 'Serviço Resend' : 'SMTP usando Nodemailer'}</p>
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
        console.log(`Usando email: ${smtp_user}`);
        console.log(`Método de segurança: ${smtp_security}`);
        
        // Get domain from email for message headers
        const emailDomain = smtp_user.split('@')[1];
        
        // Create a unique message ID
        const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@${emailDomain}`;
        
        // Determinar se a conexão deve ser segura
        const secureConnection = smtp_security === 'ssl' || smtp_port === 465;
        
        console.log(`Configuração de conexão segura: ${secureConnection} (baseado no security=${smtp_security} e porta=${smtp_port})`);
        
        // Configurar transporte Nodemailer
        const transporter = nodemailer.createTransport({
          host: smtp_server,
          port: smtp_port,
          secure: secureConnection,
          auth: {
            user: smtp_user,
            pass: smtp_password
          },
          // Para desenvolvimento/teste, permitir certificados auto-assinados
          tls: {
            rejectUnauthorized: false
          },
          // Ativar logs para diagnóstico
          debug: true,
          logger: true
        });
        
        console.log("Transporte Nodemailer configurado, testando conexão...");
        
        // Testar conexão SMTP
        await transporter.verify();
        
        console.log("Conexão SMTP verificada com sucesso!");
        
        // Preparar dados do email
        const mailOptions = {
          from: `"${fromName}" <${smtp_user}>`,
          to: email,
          subject: "Teste de Email do DisparoPro",
          html: htmlContent,
          messageId: `<${messageId}>`,
          headers: {
            'X-Mailer': 'DisparoPro Nodemailer',
            'X-Sender': smtp_user
          }
        };
        
        console.log(`Enviando email de teste: De: ${fromName} <${smtp_user}> Para: ${email}`);
        
        // Enviar email
        const info = await transporter.sendMail(mailOptions);
        
        console.log("Email de teste enviado com sucesso:", info);
        
        // Retornar sucesso
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email de teste enviado com sucesso via SMTP com Nodemailer!",
            details: {
              provider: "smtp_nodemailer",
              server: smtp_server,
              port: smtp_port,
              from: `${fromName} <${smtp_user}>`,
              domain: emailDomain,
              message_id: info.messageId || messageId,
              transport: "nodemailer"
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (smtpError) {
        console.error("Erro SMTP detalhado:", smtpError);
        
        let errorMessage = smtpError.message || "Verifique suas credenciais e configurações do servidor";
        
        // Melhorar mensagens de erro comuns
        if (errorMessage.includes('Authentication')) {
          errorMessage = "Falha na autenticação. Verifique seu usuário e senha SMTP.";
        } else if (errorMessage.includes('Connection refused')) {
          errorMessage = "Conexão recusada. Verifique o servidor e porta SMTP.";
        } else if (errorMessage.includes('timeout')) {
          errorMessage = "Conexão expirou. Verifique o servidor e porta SMTP ou se há bloqueios de firewall.";
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro de conexão SMTP: ${errorMessage}`,
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
      
      console.log("Usando serviço Resend para teste de email");
      
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
        console.error("Erro ao enviar email de teste com Resend:", result.error);
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
      
      console.log("Email de teste enviado com sucesso via Resend");
      
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
    console.error("Erro geral no teste SMTP:", error);
    
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
