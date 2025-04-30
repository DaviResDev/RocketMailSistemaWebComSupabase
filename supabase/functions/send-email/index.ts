
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  contato_id?: string;
  template_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('email_smtp, email_porta, email_usuario, email_senha, foto_perfil, area_negocio')
      .single();
      
    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ 
          error: "Configurações de email não encontradas. Configure seu SMTP primeiro."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!settings.email_smtp || !settings.email_porta || !settings.email_usuario || !settings.email_senha) {
      return new Response(
        JSON.stringify({ 
          error: "Configurações de email incompletas. Por favor, configure seu SMTP corretamente."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { to, subject, content } = await req.json() as EmailRequest;
    
    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos para envio de email" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Configurar cliente SMTP
    const client = new SMTPClient({
      connection: {
        hostname: settings.email_smtp,
        port: settings.email_porta,
        tls: true,
        auth: {
          username: settings.email_usuario,
          password: settings.email_senha,
        },
      },
    });

    // Gerar assinatura com foto do perfil se disponível
    let assinatura = "";
    if (settings.foto_perfil) {
      assinatura += `<div><img src="${settings.foto_perfil}" alt="Foto de perfil" style="max-width: 100px; max-height: 100px; border-radius: 50%;"></div>`;
    }

    if (settings.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${settings.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${settings.email_usuario}</div>`;

    // Criar corpo HTML do email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <div style="padding: 10px; font-size: 12px; color: #666;">
          ${assinatura}
        </div>
      </div>
    `;
    
    // Enviar email
    await client.send({
      from: settings.email_usuario,
      to: to,
      subject: subject,
      html: htmlContent,
    });
    
    await client.close();
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso!" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro no envio de email:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
