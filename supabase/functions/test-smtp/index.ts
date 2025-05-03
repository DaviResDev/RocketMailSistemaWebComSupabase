
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
      // Create SMTP client
      const client = new SmtpClient();

      // Configure connection options
      const connectionConfig = {
        hostname: smtp_server,
        port: smtp_port,
        username: smtp_user,
        password: smtp_password,
      };

      // Connect based on security type
      if (smtp_security === "tls") {
        await client.connectTLS(connectionConfig);
      } else if (smtp_security === "ssl") {
        await client.connect(connectionConfig);
      } else {
        // No security
        await client.connect(connectionConfig);
      }
      
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
