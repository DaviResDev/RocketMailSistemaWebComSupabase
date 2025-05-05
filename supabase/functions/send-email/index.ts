
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

interface SmtpResponse {
  success: boolean;
  message?: string;
  details?: string;
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
    console.log("Email will be sent to:", to);
    console.log("Email subject:", subject);
    
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

    // Function to handle the actual SMTP sending with improved error handling
    const sendSmtpEmail = async (): Promise<SmtpResponse> => {
      try {
        console.log("Creating SMTP client with denomailer library");
        
        // Determine connection security type
        const secure = emailConfig.smtp_seguranca === "ssl" || emailConfig.email_porta === 465;
        console.log(`Connection security: ${secure ? 'SSL/TLS' : 'STARTTLS if available'}`);
        
        // Create client with new library
        const client = new SMTPClient({
          connection: {
            hostname: emailConfig.email_smtp,
            port: emailConfig.email_porta,
            auth: {
              username: emailConfig.email_usuario,
              password: emailConfig.email_senha,
            },
            tls: secure,
            timeout: 30000, // 30 seconds timeout
          },
          debug: {
            log: true,
          },
        });

        console.log("SMTP client configuration complete");
        
        // Prepare message
        const messageData = {
          from: emailConfig.smtp_nome ? 
            `${emailConfig.smtp_nome} <${emailConfig.email_usuario}>` : 
            emailConfig.email_usuario,
          to: to,
          subject: subject,
          html: htmlContent,
          cc: cc || [],
          bcc: bcc || []
        };
        
        // Add attachments if provided
        if (attachments && attachments.length > 0) {
          console.log(`Processing ${attachments.length} attachments`);
          
          const processedAttachments = [];
          
          for (const attachment of attachments) {
            try {
              // Convert base64 to Uint8Array
              const binaryContent = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
              
              processedAttachments.push({
                filename: attachment.filename,
                content: binaryContent,
                contentType: attachment.contentType,
              });
              
              console.log(`Attachment processed: ${attachment.filename} (${attachment.contentType})`);
            } catch (attachError) {
              console.error(`Error processing attachment ${attachment.filename}:`, attachError);
              // Continue with other attachments
            }
          }
          
          messageData.attachments = processedAttachments;
        }

        console.log("Sending email now...");
        const sendResult = await client.send(messageData);
        console.log("Email sent successfully:", sendResult);
        
        return { success: true, message: "Email enviado com sucesso" };
      } catch (error) {
        console.error("SMTP Error:", error);
        
        // Create specific error message based on error type
        let errorMessage = "Erro ao enviar email: ";
        
        if (typeof error === "object" && error !== null) {
          if ('code' in error) {
            const errorCode = (error as any).code;
            
            switch(errorCode) {
              case 'EAUTH':
                errorMessage += "Falha na autenticação. Verifique seu nome de usuário e senha.";
                break;
              case 'ESOCKET':
                errorMessage += "Problema de conexão com o servidor SMTP. Verifique o endereço e porta do servidor.";
                break;
              case 'ETIMEOUT':
                errorMessage += "Tempo limite de conexão excedido. Verifique sua conexão de rede.";
                break;
              default:
                errorMessage += error.toString();
            }
          } else {
            errorMessage += error.toString();
          }
        } else {
          errorMessage += String(error);
        }
        
        const errorResponse: SmtpResponse = { 
          success: false, 
          message: errorMessage,
          details: JSON.stringify(error, Object.getOwnPropertyNames(error))
        };
        
        throw new Error(errorMessage);
      }
    };

    try {
      // Attempt to send email
      const sendResult = await sendSmtpEmail();
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
      console.error("SMTP Send Error:", smtpError);
      
      // Create a detailed error message with solutions
      let errorMessage = `Erro ao enviar email: ${smtpError.message || "Erro desconhecido"}`;
      
      // Add common SMTP error solutions
      if (smtpError.message?.includes("authentication") || smtpError.message?.includes("auth")) {
        errorMessage += ". Verifique seu nome de usuário e senha. Para Gmail, você pode precisar gerar uma senha de aplicativo.";
      } else if (smtpError.message?.includes("timeout")) {
        errorMessage += ". Verifique se o servidor SMTP está acessível e que a porta está correta. Alguns ISPs podem estar bloqueando portas SMTP.";
      } else if (smtpError.message?.includes("certificate") || smtpError.message?.includes("SSL")) {
        errorMessage += ". Problema com o certificado SSL do servidor. Tente outra configuração de segurança (TLS <-> SSL).";
      } else if (smtpError.message?.includes("connect") || smtpError.message?.includes("connection")) {
        errorMessage += ". Não foi possível conectar ao servidor SMTP. Verifique o nome do servidor e a porta.";
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
      
      // Return appropriate error response
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: smtpError.stack
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
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
