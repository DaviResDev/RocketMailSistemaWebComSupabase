
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    const { to, subject, content, contato_id, template_id } = requestData as EmailRequest;
    
    if (!to || !subject || !content) {
      console.error("Incomplete request data:", requestData);
      throw new Error("Dados incompletos para envio de email");
    }

    // Get settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Erro ao buscar configurações de email: " + settingsError.message);
    }
    
    if (!settings || settings.length === 0) {
      console.error("No email settings found");
      throw new Error("Configurações de email não encontradas. Por favor, configure seu SMTP corretamente.");
    }
    
    const emailConfig = settings[0];
    
    if (!emailConfig.email_smtp || !emailConfig.email_porta || !emailConfig.email_usuario || !emailConfig.email_senha) {
      console.error("Incomplete email settings:", emailConfig);
      throw new Error("Configurações de email incompletas. Por favor, configure seu SMTP corretamente.");
    }
    
    console.log("Sending email to:", to);
    console.log("Subject:", subject);
    console.log("Using SMTP server:", emailConfig.email_smtp);
    
    // Configure real SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: emailConfig.email_smtp,
        port: emailConfig.email_porta,
        tls: true,
        auth: {
          username: emailConfig.email_usuario,
          password: emailConfig.email_senha,
        },
      },
      debug: true, // Enable debug logs for troubleshooting
    });

    // Generate signature with profile photo if available
    let assinatura = "";
    if (emailConfig.foto_perfil) {
      assinatura += `<div><img src="${emailConfig.foto_perfil}" alt="Foto de perfil" style="max-width: 100px; max-height: 100px; border-radius: 50%;"></div>`;
    }

    if (emailConfig.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${emailConfig.email_usuario}</div>`;

    // Create email HTML content
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
    
    // Send email with actual SMTP client
    try {
      console.log("Connecting to SMTP server...");
      
      await client.send({
        from: emailConfig.email_usuario,
        to: to,
        subject: subject,
        content: "text/html",
        html: htmlContent,
      });
      
      console.log("Email sent successfully to:", to);
      
      // Close SMTP connection
      await client.close();
      
      // If this was triggered from an envio, update its status
      if (contato_id && template_id) {
        const { data: envios } = await supabaseClient
          .from('envios')
          .select('id')
          .eq('contato_id', contato_id)
          .eq('template_id', template_id)
          .order('data_envio', { ascending: false })
          .limit(1);
          
        if (envios && envios.length > 0) {
          await supabaseClient
            .from('envios')
            .update({ status: 'entregue' })
            .eq('id', envios[0].id);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Email enviado com sucesso!" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      throw new Error("Erro ao enviar email: " + (smtpError.message || "Falha na conexão com o servidor SMTP"));
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
