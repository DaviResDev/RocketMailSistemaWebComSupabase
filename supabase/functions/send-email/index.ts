
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  cc?: string[];
  bcc?: string[];
  contato_id?: string;
  template_id?: string;
  user_id: string;
  attachments?: AttachmentData[];
}

interface AttachmentData {
  filename: string;
  content: string; // Base64 encoded content
  contentType: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments } = requestData as EmailRequest;
    
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", requestData);
      throw new Error("Dados incompletos para envio de email");
    }

    console.log("Fetching settings for user ID:", user_id);
    
    // Get settings from database for the specified user
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('user_id', user_id)
      .limit(1);
      
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Erro ao buscar configurações de email: " + settingsError.message);
    }
    
    if (!settingsData || settingsData.length === 0) {
      console.error("No email settings found for user:", user_id);
      throw new Error("Configurações de email não encontradas. Por favor, configure seu SMTP corretamente.");
    }
    
    const emailConfig = settingsData[0];
    
    if (!emailConfig.email_smtp || !emailConfig.email_porta || !emailConfig.email_usuario || !emailConfig.email_senha) {
      console.error("Incomplete email settings:", emailConfig);
      throw new Error("Configurações de email incompletas. Por favor, configure seu SMTP corretamente.");
    }
    
    console.log("Sending email to:", to);
    console.log("Subject:", subject);
    console.log("Using SMTP server:", emailConfig.email_smtp);
    console.log("Using SMTP port:", emailConfig.email_porta);
    console.log("Using SMTP username:", emailConfig.email_usuario);
    console.log("Using SMTP security:", emailConfig.smtp_seguranca || "tls");
    
    // Generate signature with area_negocio if available
    let assinatura = "";
    if (emailConfig.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${emailConfig.email_usuario}</div>`;

    // Create email HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <div style="padding: 10px; font-size: 12px; color: #666;">
          ${assinatura}
        </div>
      </div>
    `;

    try {
      // Create SMTP client
      const client = new SmtpClient();
      
      // Configure connection based on security settings
      const connectionConfig: any = {
        hostname: emailConfig.email_smtp,
        port: emailConfig.email_porta,
        username: emailConfig.email_usuario,
        password: emailConfig.email_senha,
      };

      // Set TLS/SSL based on security setting
      if (emailConfig.smtp_seguranca === "ssl") {
        // Use SSL mode for port 465
        connectionConfig.tls = true;
        console.log("Using SSL mode with TLS enabled");
      } else if (emailConfig.smtp_seguranca === "tls") {
        // Use STARTTLS mode for port 587
        connectionConfig.tls = false;
        console.log("Using STARTTLS mode");
      } else {
        // No security
        connectionConfig.tls = false;
        console.log("Using no encryption");
      }

      console.log("SMTP client connection config:", connectionConfig);
      console.log("SMTP client configured, attempting to connect...");
      
      // Connect to SMTP server using the appropriate method based on security setting
      if (emailConfig.smtp_seguranca === "ssl") {
        await client.connectTLS(connectionConfig);
      } else {
        await client.connect(connectionConfig);
        
        // If TLS is selected but not using SSL (port 587), use STARTTLS
        if (emailConfig.smtp_seguranca === "tls") {
          try {
            await client.starttls();
            console.log("STARTTLS successful");
          } catch (starttlsError) {
            console.error("STARTTLS failed, continuing with connection:", starttlsError);
          }
        }
      }
      
      console.log("Connected to SMTP server, sending email...");

      // Prepare email content
      const emailData: any = {
        from: emailConfig.email_usuario,
        to: to,
        subject: subject,
        html: htmlContent,
      };
      
      // Add CC and BCC if provided
      if (cc && cc.length > 0) {
        emailData.cc = cc;
      }
      
      if (bcc && bcc.length > 0) {
        emailData.bcc = bcc;
      }
      
      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments.map(attachment => ({
          filename: attachment.filename,
          content: Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0)),
          contentType: attachment.contentType,
        }));
      }

      console.log("Sending email with data:", { 
        to: emailData.to, 
        from: emailData.from, 
        subject: emailData.subject,
        hasAttachments: attachments && attachments.length > 0,
      });

      // Send the email
      const sendResult = await client.send(emailData);
      console.log("SMTP send result:", sendResult);
      
      // Close the connection
      await client.close();
      
      console.log("Email sent successfully to:", to);
      
      // If this was triggered from an envio, update its status
      if (contato_id && template_id) {
        const { data: envios } = await supabaseClient
          .from('envios')
          .select('id')
          .eq('contato_id', contato_id)
          .eq('template_id', template_id)
          .order('data_envio', { ascending: false })
          .limit(1);
          
        if (envios && envios.length > 0) {
          await supabaseClient
            .from('envios')
            .update({ status: 'entregue' })
            .eq('id', envios[0].id);
            
          console.log("Updated envio status to 'entregue'");
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email enviado com sucesso!"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      
      // Log the error details for debugging
      try {
        console.error("Error details:", JSON.stringify(smtpError));
      } catch (jsonError) {
        console.error("Error cannot be stringified:", smtpError.toString());
      }
      
      // Create a more detailed error message
      let errorMessage = `Erro ao enviar email: ${smtpError.message || "Erro desconhecido"}`;
      
      // Add common SMTP error solutions
      if (smtpError.message?.includes("authentication")) {
        errorMessage += ". Verifique seu nome de usuário e senha.";
      } else if (smtpError.message?.includes("timeout")) {
        errorMessage += ". Verifique se o servidor SMTP está acessível e que a porta está correta.";
      } else if (smtpError.message?.includes("certificate")) {
        errorMessage += ". Problema com o certificado SSL do servidor. Tente outra configuração de segurança.";
      }
      
      // Update status in database if contato_id and template_id are provided
      if (contato_id && template_id && user_id) {
        try {
          console.log("Updating envio status to 'erro'");
          const { data: envios } = await supabaseClient
            .from('envios')
            .select('id')
            .eq('contato_id', contato_id)
            .eq('template_id', template_id)
            .eq('user_id', user_id)
            .order('data_envio', { ascending: false })
            .limit(1);
            
          if (envios && envios.length > 0) {
            await supabaseClient
              .from('envios')
              .update({ 
                status: 'erro', 
                erro: errorMessage
              })
              .eq('id', envios[0].id);
              
            console.log("Updated envio status to 'erro'");
          } else {
            // Create a new error record
            await supabaseClient
              .from('envios')
              .insert([{
                contato_id,
                template_id,
                user_id,
                status: 'erro',
                erro: errorMessage
              }]);
            console.log("Created new envio record with status 'erro'");
          }
        } catch (dbError: any) {
          console.error("Error updating/creating error record:", dbError);
        }
      }
      
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
