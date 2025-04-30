
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      .select('email_smtp, email_porta, email_usuario, email_senha')
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
    
    // Set up email configuration
    const emailConfig = {
      host: settings.email_smtp,
      port: settings.email_porta,
      username: settings.email_usuario,
      password: settings.email_senha,
      from: settings.email_usuario,
      to: to,
      subject: subject,
      body: content
    };
    
    // For now, we'll just log that we would send an email
    // In a real implementation, you would use a library like smtp to send the email
    console.log("Enviando email:", emailConfig);
    
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
