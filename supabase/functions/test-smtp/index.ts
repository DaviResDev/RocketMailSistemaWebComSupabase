
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';

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
    console.log("Email sending functionality has been removed from the system");
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Funcionalidade de envio de email foi removida do sistema",
        error: "Email sending has been disabled"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Test-smtp function called but email functionality is disabled:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Funcionalidade de envio de email foi removida do sistema",
        error: "Email sending has been disabled"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
