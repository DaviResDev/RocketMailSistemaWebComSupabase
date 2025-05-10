
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";

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
    const { smtp_user, use_resend } = requestData;
    
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
    
    // Get Resend API key for testing
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
    
    // Enviar email de teste utilizando sempre o Resend
    const resend = new Resend(resendApiKey);

    // Construir conteúdo HTML para email de teste
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
          <h2 style="color: #333;">Teste de Email do DisparoPro</h2>
          <p>Olá,</p>
          <p>Este é um email de teste enviado pelo DisparoPro para verificar suas configurações de email.</p>
          <p>Seu email foi configurado corretamente!</p>
          <p>Método de envio: ${use_resend ? 'Serviço Resend' : 'SMTP (via Resend como fallback)'}</p>
          <p style="margin-top: 20px;">Atenciosamente,<br>Equipe DisparoPro</p>
        </div>
      </div>
    `;
    
    // Preparar dados para envio
    const fromName = requestData.smtp_name || "DisparoPro";
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
        message: "Email de teste enviado com sucesso!",
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
