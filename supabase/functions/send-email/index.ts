
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
    const { to, subject, content, cc, bcc, contato_id, template_id, user_id, attachments, isTest } = requestData as EmailRequest;
    
    // Validate data before proceeding
    if (!to || !subject || !content || !user_id) {
      console.error("Incomplete request data:", JSON.stringify(requestData));
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
      throw new Error("Configurações de email não encontradas.");
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

      // Determine if we should use the user's custom email or a system default
      let fromName = emailConfig.smtp_nome || 'DisparoPro';
      let fromEmail = ''; 
      
      // Verifica se o usuário tem um domínio verificado salvo nas configurações
      // Se não tem, usa o email padrão do sistema
      if (emailConfig.email_usuario && emailConfig.email_usuario.includes('@')) {
        // Extract domain from email to check if it's a common email service
        const domain = emailConfig.email_usuario.split('@')[1];
        const commonDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'aol.com'];
        
        if (commonDomains.includes(domain)) {
          // For common email services, use the shared DisparoPro sender with reply-to
          console.log(`Using shared DisparoPro sender for ${domain} address`);
          fromEmail = 'disparos@disparopro.com';
        } else {
          // For potential custom domains, try to use them directly
          // Resend will fall back if they're not verified
          fromEmail = emailConfig.email_usuario;
          console.log(`Trying to use custom domain email: ${fromEmail}`);
        }
      } else {
        // Fallback to system address if no user email is set
        fromEmail = 'disparos@disparopro.com';
        console.log(`No user email set, using system default: ${fromEmail}`);
      }
      
      // Fallback to the Resend onboarding address if necessary
      if (!fromEmail) {
        fromEmail = 'onboarding@resend.dev';
        console.log(`Falling back to Resend default: ${fromEmail}`);
      }
      
      console.log(`Sending as: ${fromName} <${fromEmail}>`);
      
      // Prepare email data for Resend
      const emailData = {
        from: `${fromName} <${fromEmail}>`,
        to: [to],  // Make sure to use array format for 'to' field
        subject: subject,
        html: htmlContent,
        reply_to: emailConfig.email_usuario || fromEmail,  // Always set reply-to for better deliverability
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

      console.log("Email data prepared:", JSON.stringify(emailData, null, 2));

      // Fix: Use try/catch to properly handle Resend API responses
      try {
        // Send the email using Resend
        const sendResult = await resend.emails.send(emailData);
        
        // Check for errors in the response
        if (!sendResult || !sendResult.id) {
          throw new Error("Resposta inválida do serviço de email");
        }
        
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
        
        // Get detailed error information
        let errorDetails = null;
        try {
          errorDetails = JSON.stringify(resendError);
        } catch (e) {
          errorDetails = String(resendError);
        }
        
        // Create a friendly error message
        let errorMessage = "Erro ao enviar email: ";
        
        if (resendError.message) {
          errorMessage += resendError.message;
        } else {
          errorMessage += "Erro desconhecido no serviço de email";
        }
        
        throw new Error(errorMessage);
      }
    } catch (emailError: any) {
      console.error("Email sending error:", emailError);
      
      // Get detailed error information
      let errorDetails = null;
      try {
        errorDetails = JSON.stringify(emailError, Object.getOwnPropertyNames(emailError));
      } catch (e) {
        errorDetails = String(emailError);
      }
      
      // Create a friendly error message
      let errorMessage = "Erro ao enviar email: ";
      
      // Criar mensagens específicas para erros comuns do Resend
      if (emailError.statusCode === 403) {
        errorMessage += "Permissão negada pelo servidor de email. Verifique se o domínio está verificado no Resend.";
      } else if (emailError.message?.includes('domain') && emailError.message?.includes('verify')) {
        errorMessage += "O domínio do email remetente precisa ser verificado no Resend. Foi usado um email padrão do sistema.";
      } else if (emailError.statusCode === 429) {
        errorMessage += "Limite de envios excedido. Tente novamente mais tarde.";
      } else {
        errorMessage += emailError.message || "Erro desconhecido no serviço de email";
      }
      
      // Log specific error information for debugging
      if (emailError.statusCode) {
        console.error(`Resend API status code: ${emailError.statusCode}`);
      }
      
      if (emailError.response) {
        console.error("Resend API response:", emailError.response);
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
