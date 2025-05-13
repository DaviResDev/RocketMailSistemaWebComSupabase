
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "https://esm.sh/resend@1.1.0";

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
  agendamento_id?: string;
  attachments?: AttachmentData[];
  isTest?: boolean;
}

interface AttachmentData {
  filename: string;
  content: string; // Base64 encoded content
  contentType: string;
}

interface SmtpConfig {
  server: string;
  port: number;
  user: string;
  password: string;
  security: string;
  nome: string;
  use_smtp: boolean;
}

// Import required Node.js modules
const nodemailer = require('nodemailer');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Log environment variables (without revealing full keys)
    console.log("SUPABASE_URL available:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!supabaseServiceKey);
    console.log("RESEND_API_KEY available:", !!resendApiKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error",
          error: "Server configuration error: Missing Supabase credentials" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate request
    let requestData: EmailRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid request format",
          error: "Invalid JSON format" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments, isTest, agendamento_id } = requestData;
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Incomplete data for email send",
          error: "Missing required data: recipient, subject, content or user ID" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate recipient email format
    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(to)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid recipient email",
          error: "Invalid email format for recipient" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Preparing to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    
    // Get settings from database for the specified user
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error fetching settings",
          error: "Error fetching email settings: " + settingsError.message 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!settingsData) {
      console.error("Email settings not found for user:", user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Settings not found",
          error: "Email settings not found for user" 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const emailConfig = settingsData;
    console.log("Email configuration:", JSON.stringify({
      use_smtp: emailConfig.use_smtp,
      email_smtp: emailConfig.email_smtp ? "configured" : "not configured",
      smtp_nome: emailConfig.smtp_nome || "not defined",
      email_usuario: emailConfig.email_usuario ? "configured" : "not configured",
      email_porta: emailConfig.email_porta
    }));
    
    // Check SMTP configuration
    const smtpConfig: SmtpConfig = {
      server: emailConfig.email_smtp,
      port: emailConfig.email_porta,
      user: emailConfig.email_usuario,
      password: emailConfig.email_senha,
      security: emailConfig.smtp_seguranca || 'tls',
      nome: emailConfig.smtp_nome || '',
      use_smtp: Boolean(emailConfig.use_smtp)
    };
    
    // Fix port if it's a common error (584 instead of 587)
    if (smtpConfig.port === 584) {
      console.log("Port 584 detected, correcting to 587 (standard SMTP port with TLS)");
      smtpConfig.port = 587;
    }
    
    // Check if all required fields for SMTP are present
    const useSmtp = smtpConfig.use_smtp && 
                    smtpConfig.server && 
                    smtpConfig.port && 
                    smtpConfig.user && 
                    smtpConfig.password;
    
    console.log("Using SMTP:", useSmtp);
    if (useSmtp) {
      console.log("SMTP Server:", smtpConfig.server);
      console.log("SMTP Port:", smtpConfig.port);
      console.log("SMTP User:", smtpConfig.user);
      console.log("SMTP Security:", smtpConfig.security);
    }
    
    // Generate signature with area_negocio if available
    let signature = "";
    if (emailConfig.area_negocio) {
      signature += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    signature += `<div style="margin-top: 5px;">${emailConfig.email_usuario || ''}</div>`;

    // Create HTML content with customized content
    // Replace placeholders with real data if not a test email
    let processedContent = content;
    
    // If not a test email, try to get contact information for personalization
    if (!isTest && contato_id) {
      try {
        const { data: contatoData } = await supabaseClient
          .from('contatos')
          .select('*')
          .eq('id', contato_id)
          .maybeSingle();
          
        if (contatoData) {
          processedContent = processedContent
            .replace(/{nome}/g, contatoData.nome || "")
            .replace(/{email}/g, contatoData.email || "")
            .replace(/{telefone}/g, contatoData.telefone || "")
            .replace(/{razao_social}/g, contatoData.razao_social || "")
            .replace(/{cliente}/g, contatoData.cliente || "");
        }
      } catch (error) {
        console.error("Error fetching contact data for personalization:", error);
        // Continue without personalization if there's an error
      }
    }
    
    // Replace date placeholders
    const currentDate = new Date();
    processedContent = processedContent
      .replace(/{dia}/g, currentDate.toLocaleDateString('pt-BR'));

    // Create final HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px;">
          ${processedContent.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <div style="padding: 10px; font-size: 12px; color: #666;">
          ${signature}
        </div>
      </div>
    `;

    try {
      // Process attachments if any
      const processedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        console.log(`Processing ${attachments.length} attachments`);
        
        for (const attachment of attachments) {
          try {
            processedAttachments.push({
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            });
            
            console.log(`Attachment processed: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }
      }

      let sendResult;
      
      // If the user has configured SMTP and wants to use SMTP
      if (useSmtp) {
        console.log("Attempting to send email via SMTP with Nodemailer");
        
        try {
          // Set fromName and fromEmail correctly
          const fromName = smtpConfig.nome || "DisparoPro";
          const fromEmail = smtpConfig.user; // Use the email configured in SMTP
          
          // Detailed logs for debugging
          console.log(`Configuring SMTP connection to ${smtpConfig.server}:${smtpConfig.port}`);
          console.log(`Using fromEmail: ${fromEmail}, fromName: ${fromName}`);
          
          // Get email domain for message headers
          const emailDomain = fromEmail.split('@')[1];
          
          // Create unique message ID
          const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@${emailDomain}`;
          
          // SMTP transport configuration with Nodemailer
          const secureConnection = smtpConfig.security === 'ssl' || smtpConfig.port === 465;
          
          const transporter = nodemailer.createTransport({
            host: smtpConfig.server,
            port: smtpConfig.port,
            secure: secureConnection,
            auth: {
              user: smtpConfig.user,
              pass: smtpConfig.password,
            },
            connectionTimeout: 30000, // 30 second timeout instead of default
            greetingTimeout: 30000,
            socketTimeout: 60000,
          });
          
          console.log("SMTP transport configured with Nodemailer");
          
          // Create email options
          let emailData = {
            from: `${fromName} <${fromEmail}>`,
            to: to,
            subject: subject,
            html: htmlContent,
          };
          
          // Add CC if provided
          if (cc && cc.length > 0) {
            emailData.cc = cc.join(', ');
            console.log(`Adding CC: ${cc.join(', ')}`);
          }
          
          // Add BCC if provided
          if (bcc && bcc.length > 0) {
            emailData.bcc = bcc.join(', ');
            console.log(`Adding BCC: ${bcc.join(', ')}`);
          }
          
          // Add attachments if provided
          if (processedAttachments.length > 0) {
            emailData.attachments = processedAttachments.map(attachment => ({
              filename: attachment.filename,
              content: Buffer.from(attachment.content, 'base64'),
              contentType: attachment.contentType,
            }));
            console.log(`Adding ${processedAttachments.length} attachments to SMTP email`);
          }
          
          // Tracking log
          console.log(`Sending email via SMTP Nodemailer: From: ${fromName} <${fromEmail}> to ${to}`);
          
          // Send email
          const info = await transporter.sendMail(emailData);
          await transporter.close();
          
          console.log("Email sent successfully via SMTP Nodemailer:", info);
          
          sendResult = {
            id: messageId,
            provider: "smtp_nodemailer",
            success: true,
            from: fromEmail,
            reply_to: fromEmail,
            server: smtpConfig.server,
            port: smtpConfig.port,
            sender_name: fromName,
            sender_email: fromEmail,
            domain: emailDomain,
            transport: "nodemailer"
          };
        } catch (smtpError) {
          console.error("Error sending via SMTP Nodemailer:", smtpError);
          
          // If the user explicitly configured to use SMTP, don't fallback to Resend
          if (!resendApiKey) {
            throw new Error(`SMTP Error: ${smtpError.message}`);
          }
          
          console.log("SMTP error, trying fallback with Resend...");
          
          // Use Resend as fallback if there's an error with SMTP
          const resend = new Resend(resendApiKey);
          const fromName = smtpConfig.nome || "DisparoPro";
          const fromEmail = "onboarding@resend.dev";
          
          const result = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject: subject,
            html: htmlContent,
            cc: cc,
            bcc: bcc,
            reply_to: smtpConfig.user,
            attachments: processedAttachments.length > 0 ? 
              processedAttachments.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
              })) : undefined
          });
          
          if (result.error) {
            throw new Error(`SMTP error and Resend fallback error: ${result.error.message}`);
          }
          
          sendResult = {
            id: result.id,
            provider: "resend_fallback",
            success: true,
            from: fromEmail,
            reply_to: smtpConfig.user,
            error_original: smtpError.message
          };
          
          console.log("Email sent successfully via fallback Resend after SMTP failure");
        }
      } else if (resendApiKey) {
        // Use Resend only if the user chose not to use SMTP
        console.log("Sending email with Resend API");
        
        const resend = new Resend(resendApiKey);
        const fromName = smtpConfig.nome || "DisparoPro";
        const fromEmail = "onboarding@resend.dev";
        const replyToEmail = smtpConfig.user;
        
        console.log(`Sending with Resend as: ${fromName} <${fromEmail}> with reply-to: ${replyToEmail}`);
        
        // Prepare email data for Resend with proper headers
        const emailData = {
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlContent,
          reply_to: replyToEmail
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
          emailData.attachments = processedAttachments.map(attachment => ({
            filename: attachment.filename,
            content: attachment.content, // Resend expects content as base64 string
          }));
        }
        
        console.log("Email data prepared for Resend:", JSON.stringify({
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          reply_to: emailData.reply_to || "not defined"
        }));

        const result = await resend.emails.send(emailData);
        console.log("Resend response:", result);
        
        if (!result) {
          throw new Error("Invalid response from email service");
        }
        
        if (result.error) {
          throw new Error(result.error.message || "Unknown error sending email");
        }
        
        console.log("Email sent successfully via Resend. ID:", result.id);
        
        sendResult = {
          id: result.id,
          provider: "resend",
          success: true,
          from: fromEmail,
          reply_to: emailData.reply_to
        };
      } else {
        // We have neither SMTP nor Resend configured
        throw new Error("No email sending method available. Configure SMTP or add Resend API key.");
      }
      
      // Email sent successfully - Update status if needed
      if (contato_id && template_id && user_id) {
        try {
          // Check if there's already an envio record for this combination
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
                resposta_smtp: JSON.stringify(sendResult),
                erro: null
              })
              .eq('id', envios[0].id);
              
            console.log(`Updated sending status to 'entregue'`);
          } else {
            // Create a new record if one doesn't exist yet
            await supabaseClient
              .from('envios')
              .insert([{
                contato_id: contato_id,
                template_id: template_id,
                user_id: user_id,
                status: 'entregue',
                resposta_smtp: JSON.stringify(sendResult)
              }]);
              
            console.log(`Created new sending record with status 'entregue'`);
          }
        } catch (dbError) {
          console.error("Error updating database record:", dbError);
          // Continue execution even if DB update fails
        }
      }
      
      // Also update agendamento status if this is a scheduled email
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'enviado' })
            .eq('id', agendamento_id);
          
          console.log(`Updated agendamento status to 'enviado' for ID: ${agendamento_id}`);
        } catch (dbError) {
          console.error("Error updating agendamento status:", dbError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sent successfully!",
          provider: sendResult.provider,
          from: sendResult.from, // Include sender address in response
          reply_to: sendResult.reply_to, // Include reply-to address if available
          info: {
            messageId: sendResult.id,
            domain: sendResult.domain || (sendResult.from || '').split('@')[1],
            transport: sendResult.transport || 'default'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      
      // Create a friendly error message
      let errorMessage = "Error sending email: " + (emailError.message || "Unknown error");
      
      // Update agendamento for error case
      if (agendamento_id) {
        try {
          await supabaseClient
            .from('agendamentos')
            .update({ status: 'falha' })
            .eq('id', agendamento_id);
        } catch (dbError) {
          console.error("Error updating agendamento status:", dbError);
        }
      }
      
      // Return appropriate error response
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Failed to send email",
          error: errorMessage,
          provider: useSmtp ? "smtp" : "resend"
        }),
        { 
          status: 200, // Using 200 even for errors as requested
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Error in send-email function:", error);
    
    // Create a friendly error message
    const errorMessage = error.message || "Unknown error sending email";
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Error processing email request",
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, // Using 200 even for errors as requested
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  });
