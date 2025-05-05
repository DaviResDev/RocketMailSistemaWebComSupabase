
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

      // Set connection method based on security setting and port
      console.log(`Using security mode: ${smtp_security}`);
      
      if (smtp_security === "ssl") {
        // Use SSL/TLS for port 465
        console.log("Attempting connectTLS for SSL mode");
        await client.connectTLS(connectionConfig);
      } else {
        // Use standard connection for other ports
        console.log("Attempting standard connect");
        await client.connect(connectionConfig);
        
        // If TLS is selected but not using SSL (port 587), use STARTTLS
        if (smtp_security === "tls") {
          try {
            console.log("Attempting STARTTLS");
            await client.starttls();
            console.log("STARTTLS successful");
          } catch (starttlsError) {
            console.error("STARTTLS failed:", starttlsError);
            throw new Error(`STARTTLS failed: ${starttlsError.message}`);
          }
        }
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
      
      // Add detailed error messages for common SMTP issues
      let errorMessage = `Teste de conexão SMTP falhou: ${smtpError.message}`;
      
      if (smtpError.message?.includes("authentication")) {
        errorMessage += ". Verifique seu nome de usuário e senha.";
      } else if (smtpError.message?.includes("timeout")) {
        errorMessage += ". Verifique se o servidor SMTP está acessível e que a porta está correta.";
      } else if (smtpError.message?.includes("certificate")) {
        errorMessage += ". Problema com o certificado SSL do servidor. Tente outra configuração de segurança.";
      }
      
      throw new Error(errorMessage);
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
