
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );
    
    console.log("Fetching scheduled emails to send...");
    
    // Buscar todos os agendamentos pendentes que devem ser enviados agora
    const now = new Date().toISOString();
    const { data: agendamentos, error: agendamentosError } = await supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        contato:contatos (
          id, nome, email, telefone
        ),
        template:templates (
          id, nome, conteudo, canal
        )
      `)
      .eq('status', 'pendente')
      .lte('data_envio', now);
      
    if (agendamentosError) {
      console.error("Error fetching scheduled emails:", agendamentosError);
      throw new Error("Erro ao buscar agendamentos: " + agendamentosError.message);
    }
    
    console.log(`Found ${agendamentos?.length || 0} scheduled emails to send`);
    
    if (!agendamentos || agendamentos.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled emails to send" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Processar cada agendamento
    const results = [];
    
    for (const agendamento of agendamentos) {
      if (!agendamento.contato || !agendamento.template) {
        console.error(`Skipping agendamento ${agendamento.id} - missing contato or template`);
        continue;
      }
      
      if (!agendamento.contato.email || !agendamento.template.conteudo) {
        console.error(`Skipping agendamento ${agendamento.id} - missing email or content`);
        continue;
      }
      
      console.log(`Processing scheduled email for ${agendamento.contato.email}`);
      
      try {
        // Chamar a Edge Function de envio de email
        const { data: sendResult, error: sendError } = await supabaseAnon.functions.invoke('send-email', {
          body: {
            to: agendamento.contato.email,
            subject: agendamento.template.nome,
            content: agendamento.template.conteudo,
            contato_id: agendamento.contato_id,
            template_id: agendamento.template_id,
            user_id: agendamento.user_id,
          },
        });
        
        if (sendError) {
          console.error(`Error sending scheduled email ${agendamento.id}:`, sendError);
          
          // Atualizar status do agendamento para erro
          await supabaseAdmin
            .from('agendamentos')
            .update({ 
              status: 'erro',
              erro: sendError.message
            })
            .eq('id', agendamento.id);
          
          results.push({
            id: agendamento.id,
            status: 'erro',
            error: sendError.message
          });
        } else if (sendResult && sendResult.error) {
          console.error(`Error in send-email function for agendamento ${agendamento.id}:`, sendResult.error);
          
          // Atualizar status do agendamento para erro
          await supabaseAdmin
            .from('agendamentos')
            .update({ 
              status: 'erro',
              erro: sendResult.error
            })
            .eq('id', agendamento.id);
          
          results.push({
            id: agendamento.id,
            status: 'erro',
            error: sendResult.error
          });
        } else {
          // Sucesso no envio - atualizar status do agendamento
          await supabaseAdmin
            .from('agendamentos')
            .update({ status: 'enviado' })
            .eq('id', agendamento.id);
          
          console.log(`Successfully sent scheduled email ${agendamento.id}`);
          
          results.push({
            id: agendamento.id,
            status: 'enviado'
          });
        }
      } catch (error: any) {
        console.error(`Error processing agendamento ${agendamento.id}:`, error);
        
        // Atualizar status do agendamento para erro
        await supabaseAdmin
          .from('agendamentos')
          .update({ 
            status: 'erro',
            erro: error.message || 'Erro desconhecido'
          })
          .eq('id', agendamento.id);
        
        results.push({
          id: agendamento.id,
          status: 'erro',
          error: error.message || 'Erro desconhecido'
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error: any) {
    console.error("Error in process-scheduled-emails function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido ao processar agendamentos",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
