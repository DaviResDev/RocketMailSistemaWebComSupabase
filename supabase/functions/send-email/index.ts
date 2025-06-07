
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { processOptimizedBatch, processSingleSend } from './optimized-processor.ts';

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
    const requestData = await req.json();
    console.log("📨 Recebida requisição de envio SMTP:", {
      batch: !!requestData.batch,
      emails_count: requestData.emails?.length || 0,
      smtp_configured: !!requestData.smtp_settings?.host,
      host: requestData.smtp_settings?.host || 'não configurado'
    });

    // Verificar se SMTP está configurado
    if (!requestData.smtp_settings || !requestData.smtp_settings.host) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "SMTP deve estar configurado. Configure nas configurações do sistema." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica se é um envio em lote
    if (requestData.batch && requestData.emails && requestData.emails.length > 1) {
      console.log(`🚀 Processando lote SMTP otimizado: ${requestData.emails.length} emails`);
      
      const result = await processOptimizedBatch({
        emails: requestData.emails,
        smtp_settings: requestData.smtp_settings,
        optimization_config: requestData.optimization_config || {}
      });
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Envio individual via SMTP
    console.log("📧 Processando envio individual via SMTP");
    
    let emailData;
    if (requestData.emails && requestData.emails.length === 1) {
      emailData = requestData.emails[0];
    } else {
      // Formato de envio individual direto
      emailData = {
        to: requestData.to,
        subject: requestData.subject,
        content: requestData.content,
        contato_id: requestData.contato_id,
        template_id: requestData.template_id
      };
    }

    if (!emailData.to || !emailData.subject || !emailData.content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Parâmetros obrigatórios: to, subject, content' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar envio individual via SMTP
    const result = await processSingleSend(emailData, requestData.smtp_settings);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error: any) {
    console.error("❌ Erro no processamento SMTP:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Erro interno no servidor SMTP",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
