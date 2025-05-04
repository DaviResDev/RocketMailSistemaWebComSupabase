
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    const { smtp_server, smtp_port, smtp_user, smtp_password, smtp_security } = await req.json();
    
    if (!smtp_server || !smtp_port || !smtp_user || !smtp_password) {
      throw new Error("Parâmetros SMTP incompletos");
    }

    console.log("Testing SMTP connection to:", smtp_server, smtp_port);
    console.log("With username:", smtp_user);
    console.log("Security:", smtp_security || "tls");
    
    try {
      // Create SMTP client
      const client = new SmtpClient();
      
      // Configure connection based on security settings
      const connectionConfig = {
        hostname: smtp_server,
        port: Number(smtp_port),
        username: smtp_user,
        password: smtp_password,
      };

      // Set TLS/SSL based on security setting
      let connectMethod = 'connect';
      if (smtp_security === "tls" || smtp_security === "ssl") {
        connectMethod = 'connectTLS';
      }

      console.log(`Using connect method: ${connectMethod}`);
      
      // Connect to SMTP server using the appropriate method
      if (connectMethod === 'connectTLS') {
        await client.connectTLS(connectionConfig);
      } else {
        await client.connect(connectionConfig);
      }
      
      console.log("SMTP connection successful");
      
      // Close the connection
      await client.close();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Conexão SMTP testada com sucesso!" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      throw new Error(`Teste de conexão SMTP falhou: ${smtpError.message}`);
    }
  } catch (error: any) {
    console.error("Error in test-smtp function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
