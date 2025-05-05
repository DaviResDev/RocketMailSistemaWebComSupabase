
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
      // Determine if we should use secure connection
      const secure = smtp_security === "ssl" || Number(smtp_port) === 465;
      console.log(`Using ${secure ? 'SSL/TLS' : 'STARTTLS if available'} connection`);
      
      // Create SMTP client with denomailer library
      const client = new SMTPClient({
        connection: {
          hostname: smtp_server,
          port: Number(smtp_port),
          auth: {
            username: smtp_user,
            password: smtp_password,
          },
          tls: secure,
          timeout: 30000, // 30 seconds timeout
        },
        debug: {
          log: true,
        },
      });

      // Test connection with a validation
      await client.connect();
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
        if (smtp_server?.includes("gmail")) {
          errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo em https://myaccount.google.com/apppasswords";
        }
      } else if (smtpError.message?.includes("timeout")) {
        errorMessage += ". Verifique se o servidor SMTP está acessível e que a porta está correta.";
      } else if (smtpError.message?.includes("certificate")) {
        errorMessage += ". Problema com o certificado SSL do servidor. Tente outra configuração de segurança.";
      } else if (smtpError.message?.includes("connect")) {
        errorMessage += ". Não foi possível conectar ao servidor SMTP. Verifique o endereço e a porta.";
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
