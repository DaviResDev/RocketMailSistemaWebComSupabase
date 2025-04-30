
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId } = await req.json();

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: "Contact ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete related envios first
    const { error: enviosError } = await supabase
      .from("envios")
      .delete()
      .eq("contato_id", contactId);

    if (enviosError) {
      throw new Error(`Error deleting related envios: ${enviosError.message}`);
    }

    // Delete related agendamentos
    const { error: agendamentosError } = await supabase
      .from("agendamentos")
      .delete()
      .eq("contato_id", contactId);

    if (agendamentosError) {
      throw new Error(`Error deleting related agendamentos: ${agendamentosError.message}`);
    }

    // Now delete the contact
    const { error: contatoError } = await supabase
      .from("contatos")
      .delete()
      .eq("id", contactId);

    if (contatoError) {
      throw new Error(`Error deleting contact: ${contatoError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Contact and related records deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in handle-contact-delete function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
