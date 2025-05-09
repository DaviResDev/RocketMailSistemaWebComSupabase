
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpConfig {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_security: string;
  use_resend: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Parse request body
    let data: SmtpConfig;
    try {
      data = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid request format",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Testing configurations:", {
      use_resend: data.use_resend,
      smtp_server: data.smtp_server ? "configured" : "not configured",
      smtp_user: data.smtp_user ? "configured" : "not configured",
    });

    // Add basic validations
    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing data in request",
          provider: "unknown"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If use_resend is set to true, test Resend
    if (data.use_resend) {
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Resend API key not configured on server",
            provider: "resend"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      try {
        const resend = new Resend(resendApiKey);
        
        // Set sender name as "DisparoPro Test" and use user's email
        const fromName = "Teste DisparoPro";
        
        // For testing, we'll use onboarding@resend.dev as sender and set reply-to as user's email
        // This ensures the test email will be delivered even if domain is not verified
        const fromEmail = "onboarding@resend.dev";
        
        console.log(`Testing Resend with from: ${fromName} <${fromEmail}> and reply-to: ${data.smtp_user}`);
        
        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [data.smtp_user],
          reply_to: data.smtp_user,
          subject: "DisparoPro Connection Test",
          html: "<h1>Email test via Resend</h1><p>This is a test message to verify your Resend integration with DisparoPro.</p><p>If you received this message, your email configuration is working correctly!</p>"
        });
        
        if (result.error) {
          throw new Error(result.error.message || "Unknown error from Resend");
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Resend connection test successful! Check your inbox for the test email.",
            provider: "resend",
            info: {
              messageId: result.id,
              from: fromEmail,
              reply_to: data.smtp_user
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error testing Resend:", error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error testing Resend: ${error.message}`,
            provider: "resend"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // SMTP Test
      if (!data.smtp_server || !data.smtp_port || !data.smtp_user || !data.smtp_password) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Incomplete SMTP settings",
            provider: "smtp"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const client = new SmtpClient();
        
        // Configure SMTP connection with explicit debug info
        const secure = data.smtp_security === "ssl" || data.smtp_port === 465;
        console.log(`Testing SMTP connection ${secure ? 'with SSL/TLS' : 'with STARTTLS'} to ${data.smtp_server}:${data.smtp_port}`);
        
        // Use direct connection method for better error handling
        if (secure) {
          await client.connectTLS({
            hostname: data.smtp_server,
            port: data.smtp_port,
            username: data.smtp_user,
            password: data.smtp_password
          });
        } else {
          // For non-SSL connections, connect first then upgrade with STARTTLS
          await client.connect({
            hostname: data.smtp_server,
            port: data.smtp_port
          });
          await client.startTLS();
          await client.login(data.smtp_user, data.smtp_password);
        }
        
        // Send a test email
        const fromName = "Teste DisparoPro";
        const fromEmail = data.smtp_user;
        const fromHeader = `${fromName} <${fromEmail}>`;
        
        console.log(`Sending test email as: ${fromHeader}`);
        
        const sendResult = await client.send({
          from: fromHeader,
          to: data.smtp_user, // Send to the user's own email
          subject: "Teste de conexão SMTP DisparoPro",
          content: "text/html",
          html: "<h1>Teste de email via SMTP</h1><p>Esta é uma mensagem de teste para verificar suas configurações SMTP no DisparoPro.</p><p>Se você recebeu essa mensagem, sua configuração de email está funcionando corretamente!</p>",
        });
        
        await client.close();
        
        console.log("SMTP test result:", sendResult);

        return new Response(
          JSON.stringify({
            success: true,
            message: "SMTP connection test successful! Check your inbox for the test email.",
            provider: "smtp",
            info: {
              messageId: sendResult || "SMTP-TEST-OK",
              from: fromEmail
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error testing SMTP:", error);
        
        // Create more descriptive error message
        let errorMessage = "SMTP connection failed: " + error.message;
        
        if (error.message?.includes("authentication") || error.message?.includes("auth")) {
          errorMessage = "SMTP authentication failed: Check your username and password.";
          if (data.smtp_server?.includes("gmail")) {
            errorMessage += " For Gmail, you may need to generate an app password.";
          }
        } else if (error.message?.includes("timeout")) {
          errorMessage = "SMTP connection timeout: Check if the SMTP server is accessible.";
        } else if (error.message?.includes("certificate") || error.message?.includes("TLS")) {
          errorMessage = "SSL/TLS certificate error: Check your security settings.";
        } else if (error.message?.includes("connect") || error.message?.includes("network")) {
          errorMessage = "Failed to connect to SMTP server: Check your server address and port.";
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: errorMessage,
            provider: "smtp"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error) {
    console.error("General error in connection test:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error testing connection: ${error.message}`,
        provider: "unknown"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
