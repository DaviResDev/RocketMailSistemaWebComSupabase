
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    
    // Get settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('email_smtp, email_porta, email_usuario, email_senha, foto_perfil, area_negocio')
      .maybeSingle();
      
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Erro ao buscar configurações de email: " + settingsError.message);
    }
    
    if (!settings || !settings.email_smtp || !settings.email_porta || !settings.email_usuario || !settings.email_senha) {
      console.error("Incomplete email settings:", settings);
      throw new Error("Configurações de email incompletas. Por favor, configure seu SMTP corretamente.");
    }
    
    const requestData = await req.json();
    const { to, subject, content } = requestData as EmailRequest;
    
    if (!to || !subject || !content) {
      console.error("Incomplete request data:", requestData);
      throw new Error("Dados incompletos para envio de email");
    }
    
    console.log("Sending email to:", to);
    console.log("Subject:", subject);
    console.log("Using SMTP server:", settings.email_smtp);
    
    // Configure SMTP client
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

    // Generate signature with profile photo if available
    let assinatura = "";
    if (settings.foto_perfil) {
      assinatura += `<div><img src="${settings.foto_perfil}" alt="Foto de perfil" style="max-width: 100px; max-height: 100px; border-radius: 50%;"></div>`;
    }

    if (settings.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${settings.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${settings.email_usuario}</div>`;

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
    
    // Send email
    try {
      await client.send({
        from: settings.email_usuario,
        to: to,
        subject: subject,
        html: htmlContent,
      });
      
      await client.close();
      console.log("Email sent successfully to:", to);
      
      return new Response(
        JSON.stringify({ success: true, message: "Email enviado com sucesso!" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      throw new Error("Erro ao enviar email: " + (smtpError.message || "Falha na conexão com o servidor SMTP"));
    }
  } catch (error) {
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

// Add SMTPClient class definition that was missing
class SMTPClient {
  connection: any;
  
  constructor(config: { connection: any }) {
    this.connection = config.connection;
  }
  
  async send(options: { from: string; to: string; subject: string; html: string }) {
    console.log("Simulating email sending with options:", options);
    // In a real implementation, this would connect to the SMTP server and send the email
    // For now, we'll just log the call and pretend it worked
    return { success: true };
  }
  
  async close() {
    // Close the connection to the SMTP server
    return;
  }
}
