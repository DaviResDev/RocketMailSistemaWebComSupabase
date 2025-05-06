
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", requestData);
      throw new Error("Dados incompletos para envio de email");
    }

    console.log(`Preparing to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    
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
    
    // Log all important SMTP details for debugging
    console.log(`SMTP Server: ${emailConfig.email_smtp}`);
    console.log(`SMTP Port: ${emailConfig.email_porta}`);
    console.log(`SMTP User: ${emailConfig.email_usuario}`);
    
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
      console.log("Creating SMTP client...");
      
      // Process attachments if any
      const processedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        console.log(`Processing ${attachments.length} attachments`);
        
        for (const attachment of attachments) {
          try {
            const base64Data = attachment.content;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            processedAttachments.push({
              filename: attachment.filename,
              contentType: attachment.contentType,
              content: bytes.buffer,
            });
            
            console.log(`Attachment processed: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }
      }

      // Determine connection security based on port
      let isSecure = false;
      if (emailConfig.email_porta === 465) {
        isSecure = true;
        console.log("Using secure connection (SSL/TLS) for port 465");
      } else {
        console.log(`Using STARTTLS for port ${emailConfig.email_porta}`);
      }

      // Create the SMTP client with proper configuration
      const client = new SmtpClient();
      
      // Connect to the SMTP server
      console.log("Connecting to SMTP server...");
      await client.connectTLS({
        hostname: emailConfig.email_smtp,
        port: Number(emailConfig.email_porta),
        username: emailConfig.email_usuario,
        password: emailConfig.email_senha,
      });
      
      console.log("SMTP connection established");
      
      // Prepare sender info
      const from = emailConfig.smtp_nome ? 
        `${emailConfig.smtp_nome} <${emailConfig.email_usuario}>` : 
        emailConfig.email_usuario;
      
      // Send email
      console.log("Sending email...");

      // Prepare email data
      const emailData = {
        from: from,
        to: to,
        subject: subject,
        content: htmlContent,
        html: htmlContent,
      };
      
      // Add CC recipients if provided
      if (cc && cc.length > 0) {
        emailData.cc = cc;
      }
      
      // Add BCC recipients if provided
      if (bcc && bcc.length > 0) {
        emailData.bcc = bcc;
      }
      
      // Add attachments if any
      if (processedAttachments.length > 0) {
        emailData.attachments = processedAttachments;
      }

      // Send the email
      const sendResult = await client.send(emailData);
      console.log("Email sent successfully:", sendResult);
      
      // Close connection
      await client.close();
      
      // Update envio status if relevant ids are provided
      if (contato_id && template_id && user_id) {
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
              status: 'entregue',
              resposta_smtp: JSON.stringify(sendResult)
            })
            .eq('id', envios[0].id);
            
          console.log(`Updated envio status to 'entregue'`);
        } else {
          // Create a new record if it doesn't exist yet
          await supabaseClient
            .from('envios')
            .insert([{
              contato_id: contato_id,
              template_id: template_id,
              user_id: user_id,
              status: 'entregue',
              resposta_smtp: JSON.stringify(sendResult)
            }]);
            
          console.log(`Created new envio record with status 'entregue'`);
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
      
      // Create a detailed error message with solutions
      let errorMessage = "Erro ao enviar email: ";
      let errorDetails = null;
      
      try {
        errorDetails = JSON.stringify(smtpError, Object.getOwnPropertyNames(smtpError));
      } catch (e) {
        errorDetails = String(smtpError);
      }
      
      if (smtpError.message) {
        if (smtpError.message.includes("authentication") || smtpError.message.includes("auth")) {
          errorMessage += "Falha na autenticação. Verifique seu nome de usuário e senha.";
          if (emailConfig.email_smtp?.includes("gmail")) {
            errorMessage += " Para Gmail, você pode precisar gerar uma senha de aplicativo em https://myaccount.google.com/apppasswords";
          }
        } else if (smtpError.message.includes("timeout")) {
          errorMessage += "Tempo limite de conexão excedido. Verifique se o servidor SMTP está acessível e que a porta está correta.";
        } else if (smtpError.message.includes("certificate") || smtpError.message.includes("SSL")) {
          errorMessage += "Problema com o certificado SSL do servidor. Tente outra configuração de segurança (TLS <-> SSL).";
        } else if (smtpError.message.includes("connect") || smtpError.message.includes("connection")) {
          errorMessage += "Não foi possível conectar ao servidor SMTP. Verifique o endereço do servidor e a porta.";
        } else {
          errorMessage += smtpError.message;
        }
      } else {
        errorMessage += "Erro desconhecido no servidor SMTP";
      }
      
      // Update envio status for error
      if (contato_id && template_id && user_id) {
        try {
          console.log(`Updating envio status to 'erro'`);
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
                erro: errorMessage,
                resposta_smtp: errorDetails
              })
              .eq('id', envios[0].id);
              
            console.log(`Updated envio status to 'erro'`);
          } else {
            // Create a new error record
            await supabaseClient
              .from('envios')
              .insert([{
                contato_id,
                template_id,
                user_id,
                status: 'erro',
                erro: errorMessage,
                resposta_smtp: errorDetails
              }]);
              
            console.log(`Created new envio record with status 'erro'`);
          }
        } catch (dbError: any) {
          console.error("Error updating/creating error record:", dbError);
        }
      }
      
      // Return appropriate error response
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    // Create a friendly error message
    const errorMessage = error.message || "Erro desconhecido ao enviar email";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
