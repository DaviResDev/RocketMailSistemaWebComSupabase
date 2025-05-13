
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

// Import our email sender module
import emailSender from "../lib/email-sender.js";

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

      // Create email payload
      const emailPayload = {
        to: to,
        subject: subject,
        html: htmlContent,
        cc: cc,
        bcc: bcc,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined
      };

      // Send email using our module
      const sendResult = await emailSender.sendEmail(
        emailPayload, 
        useSmtp, 
        {
          host: smtpConfig.server,
          port: smtpConfig.port,
          secure: smtpConfig.security === 'ssl' || smtpConfig.port === 465,
          user: smtpConfig.user,
          pass: smtpConfig.password,
          name: smtpConfig.nome || 'DisparoPro'
        },
        resendApiKey,
        smtpConfig.nome || 'DisparoPro'
      );
      
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
          from: sendResult.from,
          reply_to: sendResult.reply_to,
          info: {
            messageId: sendResult.id,
            domain: (sendResult.from || '').split('@')[1],
            transport: 'nodemailer'
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
          provider: smtpConfig.use_smtp ? "smtp" : "resend"
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
