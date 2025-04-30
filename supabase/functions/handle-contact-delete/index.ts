
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contactId } = await req.json();

    if (!contactId) {
      throw new Error("ID do contato é obrigatório");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // First delete related records from envios
    const { error: enviosError } = await supabaseClient
      .from('envios')
      .delete()
      .eq('contato_id', contactId);

    if (enviosError) {
      throw new Error(`Erro ao excluir envios relacionados: ${enviosError.message}`);
    }

    // Then delete related records from agendamentos
    const { error: agendamentosError } = await supabaseClient
      .from('agendamentos')
      .delete()
      .eq('contato_id', contactId);

    if (agendamentosError) {
      throw new Error(`Erro ao excluir agendamentos relacionados: ${agendamentosError.message}`);
    }

    // Finally delete the contact
    const { error: contatoError } = await supabaseClient
      .from('contatos')
      .delete()
      .eq('id', contactId);

    if (contatoError) {
      throw new Error(`Erro ao excluir contato: ${contatoError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Contato e registros relacionados excluídos com sucesso" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro na exclusão de contato:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
