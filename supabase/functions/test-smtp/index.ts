
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpTestRequest {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_security: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { smtp_server, smtp_port, smtp_user, smtp_password, smtp_security } = requestData as SmtpTestRequest;
    
    if (!smtp_server || !smtp_port || !smtp_user || !smtp_password) {
      throw new Error("Dados incompletos para teste SMTP");
    }

    console.log("Testing SMTP connection to:", smtp_server);
    console.log("Port:", smtp_port);
    console.log("User:", smtp_user);
    console.log("Security type:", smtp_security);
    
    try {
      // Configure security options
      const tls = smtp_security === 'tls';
      
      // Create SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: smtp_server,
          port: smtp_port,
          tls: tls,
          auth: {
            username: smtp_user,
            password: smtp_password,
          }
        }
      });

      console.log("Connection configured, attempting to connect...");
      
      // Test the connection by verifying connectivity
      await client.connect();
      console.log("SMTP connection successful");
      
      // Close the connection
      await client.close();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Conexão SMTP estabelecida com sucesso!"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (smtpError: any) {
      console.error("SMTP Connection Error:", smtpError);
      throw new Error(`Falha na conexão SMTP: ${smtpError.message}`);
    }
  } catch (error: any) {
    console.error("Error in test-smtp function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao testar conexão SMTP" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
