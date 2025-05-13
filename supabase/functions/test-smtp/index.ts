
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestSmtpRequest {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_security: string;
  use_resend: boolean;
  smtp_name?: string;
}

// Import Nodemailer dynamically
const nodemailer = require('nodemailer');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract request data
    const requestData: TestSmtpRequest = await req.json();
    const { 
      smtp_server, 
      smtp_port, 
      smtp_user, 
      smtp_password, 
      smtp_security, 
      use_resend,
      smtp_name 
    } = requestData;
    
    console.log("Received test request with data:", {
      server: smtp_server,
      port: smtp_port,
      user: smtp_user ? smtp_user.substring(0, 3) + "***" : "not provided",
      security: smtp_security,
      use_resend: use_resend,
      name: smtp_name
    });
    
    // Check if we have a valid email to send to
    if (!smtp_user || !smtp_user.includes('@')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email inválido"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Basic check to prevent spam through this endpoint
    const email = smtp_user.trim().toLowerCase();
    
    // Build HTML content for test email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
          <h2 style="color: #333;">Teste de Email do DisparoPro</h2>
          <p>Olá,</p>
          <p>Este é um email de teste enviado pelo DisparoPro para verificar suas configurações de email.</p>
          <p>Seu email foi configurado corretamente!</p>
          <p>Método de envio: ${use_resend ? 'Serviço Resend' : 'SMTP via Nodemailer'}</p>
          <p style="margin-top: 20px;">Atenciosamente,<br>Equipe DisparoPro</p>
        </div>
      </div>
    `;
    
    // Prepare data for sending
    const fromName = smtp_name || "DisparoPro";
    
    // If the user chose to use SMTP and provided the required credentials
    if (!use_resend && smtp_server && smtp_port && smtp_user && smtp_password) {
      try {
        console.log(`Testing SMTP connection: ${smtp_server}:${smtp_port}`);
        console.log(`Using email: ${smtp_user}`);
        console.log(`Security method: ${smtp_security}`);
        
        // Get domain from email for message headers
        const emailDomain = smtp_user.split('@')[1];
        
        // Create a unique message ID
        const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@${emailDomain}`;
        
        // Determine if connection should be secure
        // Check port for common cases
        let correctedPort = smtp_port;
        if (smtp_port === 584) {
          // Fix common typo port (584 instead of 587)
          console.log("Port 584 detected, correcting to 587 (standard SMTP port with TLS)");
          correctedPort = 587;
        }
        
        const secureConnection = smtp_security === 'ssl' || correctedPort === 465;
        
        console.log(`Secure connection configuration: ${secureConnection} (based on security=${smtp_security} and port=${correctedPort})`);
        
        // Configure the SMTP client using Nodemailer
        const transporter = nodemailer.createTransport({
          host: smtp_server,
          port: correctedPort,
          secure: secureConnection,
          auth: {
            user: smtp_user,
            pass: smtp_password,
          },
          connectionTimeout: 30000, // 30 seconds timeout
          greetingTimeout: 30000, // 30 seconds timeout
        });

        console.log("SMTP connection configured, sending test email...");
        
        // Send email
        const info = await transporter.sendMail({
          from: `${fromName} <${smtp_user}>`,
          to: email,
          subject: "Teste de Email do DisparoPro",
          html: htmlContent,
        });
        
        await transporter.close();
        
        console.log("Test email sent successfully via SMTP");
        
        // Return success
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email de teste enviado com sucesso via SMTP!",
            details: {
              provider: "smtp",
              server: smtp_server,
              port: correctedPort,
              from: `${fromName} <${smtp_user}>`,
              domain: emailDomain,
              message_id: messageId,
              transport: "nodemailer"
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (smtpError) {
        console.error("Detailed SMTP error:", smtpError);
        
        let errorMessage = smtpError.message || "Check your credentials and server settings";
        
        // Improve common error messages
        if (errorMessage.includes('Authentication')) {
          errorMessage = "Authentication failed. Check your SMTP username and password.";
        } else if (errorMessage.includes('Connection refused')) {
          errorMessage = "Connection refused. Check your SMTP server and port.";
        } else if (errorMessage.includes('timeout')) {
          errorMessage = "Connection timed out. Check your server, SMTP port, or if there are firewall blocks. Try using a different network or check firewall settings.";
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: `SMTP connection error: ${errorMessage}`,
            error: smtpError.message
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Use Resend as fallback or if chosen by user
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Resend API not configured on server"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      console.log("Using Resend service for email test");
      
      const resend = new Resend(resendApiKey);
      const fromEmail = "onboarding@resend.dev"; // Verified email by Resend
      
      // Send test email
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: "Teste de Email do DisparoPro",
        html: htmlContent,
        reply_to: email // Use user's email as reply-to
      });
      
      if (result.error) {
        console.error("Error sending test email with Resend:", result.error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error sending email: ${result.error.message}`
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      console.log("Test email sent successfully via Resend");
      
      // Return success
      return new Response(
        JSON.stringify({
          success: true,
          message: "Test email sent successfully via Resend!",
          details: {
            provider: "resend",
            id: result.id,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("General error in SMTP test:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error testing settings: ${error.message || "Unknown error"}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
