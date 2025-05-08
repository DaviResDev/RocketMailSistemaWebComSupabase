
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
    console.log("RESEND_API_KEY starts with:", resendApiKey?.substring(0, 5));
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }
    
    if (!resendApiKey) {
      console.error("Missing environment variable: RESEND_API_KEY");
      throw new Error("Resend API key not configured. Please add RESEND_API_KEY to your environment variables.");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    
    const requestData = await req.json();
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments, isTest, agendamento_id } = requestData as EmailRequest;
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ error: "Dados incompletos para envio de email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Erro ao buscar configurações de email: " + settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!settingsData || settingsData.length === 0) {
      console.error("No email settings found for user:", user_id);
      return new Response(
        JSON.stringify({ error: "Configurações de email não encontradas." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const emailConfig = settingsData[0];
    
    // Generate signature with area_negocio if available
    let assinatura = "";
    if (emailConfig.area_negocio) {
      assinatura += `<div style="margin-top: 5px;"><strong>${emailConfig.area_negocio}</strong></div>`;
    }

    assinatura += `<div style="margin-top: 5px;">${emailConfig.email_usuario || ''}</div>`;

    // Create email HTML content with personalized content
    // Replace placeholders with real data if not a test email
    let processedContent = content;
    
    // If it's not a test email, try to get contact information for personalization
    if (!isTest && contato_id) {
      try {
        const { data: contatoData } = await supabaseClient
          .from('contatos')
          .select('*')
          .eq('id', contato_id)
          .single();
          
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
          ${assinatura}
        </div>
      </div>
    `;

    try {
      console.log("Sending email with Resend using API key...");
      
      // Process attachments if any
      const processedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        console.log(`Processing ${attachments.length} attachments`);
        
        for (const attachment of attachments) {
          try {
            processedAttachments.push({
              filename: attachment.filename,
              content: attachment.content,
            });
            
            console.log(`Attachment processed: ${attachment.filename}`);
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }
      }

      // Use onboarding@resend.dev as the sender for testing
      // This is guaranteed to work with any Resend API key
      const fromEmail = 'onboarding@resend.dev';
      const fromName = emailConfig.smtp_nome || 'DisparoPro';
      
      console.log(`Sending as: ${fromName} <${fromEmail}>`);
      
      // Prepare email data for Resend
      const emailData = {
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: htmlContent,
        reply_to: emailConfig.email_usuario || fromEmail,
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

      console.log("Email data prepared:", JSON.stringify({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        reply_to: emailData.reply_to
      }));

      // Send the email using Resend with proper error handling
      try {
        const sendResult = await resend.emails.send(emailData);
        console.log("Resend response:", sendResult);
        
        // Check for response validity
        if (!sendResult) {
          throw new Error("Resposta inválida do serviço de email");
        }
        
        if (sendResult.error) {
          throw new Error(sendResult.error.message || "Erro desconhecido ao enviar email");
        }
        
        // Success case
        console.log("Email sent successfully. Resend ID:", sendResult.id);
        
        // Update envio status if relevant ids are provided
        if (contato_id && template_id && user_id) {
          try {
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
          } catch (dbError) {
            console.error("Error updating database record:", dbError);
            // Continue execution even if DB update fails
          }
        }
        
        // Also update the agendamento status if this was from a scheduled email
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
            message: "Email enviado com sucesso!",
            id: sendResult.id
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } catch (resendError: any) {
        console.error("Resend API error:", resendError);
        
        if (resendError.statusCode) {
          console.error(`Resend API status code: ${resendError.statusCode}`);
        }
        
        // Create a friendly error message
        let errorMessage = resendError.message || "Erro ao conectar com serviço de email";
        
        // Add agendamento update for error case
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
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: "Falha ao enviar email através do Resend API"
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } catch (emailError: any) {
      console.error("Email sending error:", emailError);
      
      // Create a friendly error message
      let errorMessage = "Erro ao enviar email: " + (emailError.message || "Erro desconhecido");
      
      // Add agendamento update for error case
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
          error: errorMessage,
          details: "Falha ao enviar email"
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
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
