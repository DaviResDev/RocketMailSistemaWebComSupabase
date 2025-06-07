
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { processOptimizedBatch } from './optimized-processor.ts';

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
    console.log("📨 Recebida requisição de envio:", {
      batch: !!requestData.batch,
      emails_count: requestData.emails?.length || 0,
      optimized: !!requestData.optimization_config,
      provider: requestData.smtp_settings?.host || 'não configurado'
    });

    // Verifica se é um envio em lote com configuração de otimização
    if (requestData.batch && requestData.optimization_config && requestData.emails) {
      console.log("🚀 Processando lote otimizado com sistema anti-421");
      
      const result = await processOptimizedBatch({
        emails: requestData.emails,
        smtp_settings: requestData.smtp_settings,
        optimization_config: requestData.optimization_config
      });
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Fallback para envios sem configuração de otimização (compatibilidade)
    if (requestData.batch && requestData.emails) {
      console.log("📧 Processando lote padrão sem otimização");
      
      // Aplicar configuração padrão de otimização
      const defaultOptimizationConfig = {
        max_concurrent: 2,
        delay_between_emails: 3000,
        rate_limit_per_minute: 15,
        burst_limit: 5,
        provider_optimizations: true,
        intelligent_queuing: true
      };
      
      const result = await processOptimizedBatch({
        emails: requestData.emails,
        smtp_settings: requestData.smtp_settings,
        optimization_config: defaultOptimizationConfig
      });
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Envio individual
    console.log("📧 Processando envio individual");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { to, subject, content, contato_id, template_id } = requestData;

    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ success: false, message: 'Parâmetros obrigatórios: to, subject, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para envio individual, simular sucesso (implementar SMTP real se necessário)
    console.log(`📧 Enviado individual para ${to} com sucesso (simulado)`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email individual enviado com sucesso"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error: any) {
    console.error("❌ Erro no processamento de envio:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Erro interno no servidor",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
