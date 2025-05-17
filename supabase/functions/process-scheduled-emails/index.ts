
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }
    
    if (!resendApiKey) {
      console.error("Missing environment variable: RESEND_API_KEY");
      throw new Error("Resend API key not configured. Please add RESEND_API_KEY to your environment variables.");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );
    
    console.log("Fetching scheduled emails to send...");
    
    // Buscar todos os agendamentos pendentes que devem ser enviados agora
    const now = new Date().toISOString();
    const { data: agendamentos, error: agendamentosError } = await supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        contato:contato_id(
          id, nome, email, telefone
        ),
        template:template_id(
          id, nome, conteudo, canal, signature_image, image_url, attachments
        ),
        user:user_id(
          id
        )
      `)
      .eq('status', 'pendente')
      .lte('data_envio', now);
      
    if (agendamentosError) {
      console.error("Error fetching scheduled emails:", agendamentosError);
      throw new Error("Erro ao buscar agendamentos: " + agendamentosError.message);
    }
    
    console.log(`Found ${agendamentos?.length || 0} scheduled emails to send`);
    
    if (!agendamentos || agendamentos.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled emails to send" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Processar cada agendamento
    const results = [];
    
    for (const agendamento of agendamentos) {
      if (!agendamento.contato || !agendamento.template) {
        console.error(`Skipping agendamento ${agendamento.id} - missing contato or template`);
        
        // Update status to erro
        await supabaseAdmin
          .from('agendamentos')
          .update({ 
            status: 'erro',
            erro: 'Contato ou template não encontrado'
          })
          .eq('id', agendamento.id);
        
        results.push({
          id: agendamento.id,
          status: 'erro',
          error: 'Contato ou template não encontrado'
        });
        continue;
      }
      
      if (!agendamento.contato.email || !agendamento.template.conteudo) {
        console.error(`Skipping agendamento ${agendamento.id} - missing email or content`);
        
        // Update status to erro
        await supabaseAdmin
          .from('agendamentos')
          .update({ 
            status: 'erro',
            erro: 'Email do contato ou conteúdo do template não encontrado'
          })
          .eq('id', agendamento.id);
        
        results.push({
          id: agendamento.id,
          status: 'erro',
          error: 'Email do contato ou conteúdo do template não encontrado'
        });
        continue;
      }
      
      console.log(`Processing scheduled email for ${agendamento.contato.email}`);
      
      try {
        // Get user settings for signature
        const { data: userSettings, error: settingsError } = await supabaseAdmin
          .from('configuracoes')
          .select('signature_image')
          .eq('user_id', agendamento.user_id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.warn(`Could not fetch user settings: ${settingsError.message}`);
        }
        
        // Use user settings signature or template signature
        const signatureImage = userSettings?.signature_image || agendamento.template.signature_image;
        
        // Process attachments if present
        let attachments = null;
        if (agendamento.template.attachments) {
          if (typeof agendamento.template.attachments === 'string') {
            try {
              attachments = JSON.parse(agendamento.template.attachments);
            } catch (e) {
              console.error("Error parsing attachments:", e);
            }
          } else {
            attachments = agendamento.template.attachments;
          }
        }
        
        // Chamar a Edge Function de envio de email com retry logic
        let attemptCount = 0;
        const maxAttempts = 2;
        let success = false;
        let lastError = null;
        
        while (attemptCount < maxAttempts && !success) {
          attemptCount++;
          
          try {
            console.log(`Attempt ${attemptCount} to send email to ${agendamento.contato.email}`);
            
            const currentDate = new Date();
            const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
            const formattedTime = `${currentDate.toLocaleTimeString('pt-BR')}`;
            
            // Process template with actual contato data
            let processedContent = agendamento.template.conteudo
              .replace(/\{\{nome\}\}/g, agendamento.contato.nome || "")
              .replace(/\{\{email\}\}/g, agendamento.contato.email || "")
              .replace(/\{\{telefone\}\}/g, agendamento.contato.telefone || "")
              .replace(/\{\{data\}\}/g, formattedDate)
              .replace(/\{\{hora\}\}/g, formattedTime);
            
            const { data: sendResult, error: sendError } = await supabaseAnon.functions.invoke('send-email', {
              body: {
                to: agendamento.contato.email,
                subject: agendamento.template.nome,
                content: processedContent,
                contato_id: agendamento.contato_id,
                contato_nome: agendamento.contato.nome,
                template_id: agendamento.template_id,
                user_id: agendamento.user_id,
                signature_image: signatureImage,
                attachments: attachments,
                image_url: agendamento.template.image_url
              },
            });
            
            if (sendError) {
              console.error(`Error on attempt ${attemptCount}:`, sendError);
              lastError = sendError;
              // Wait a moment before retrying (500ms)
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            if (!sendResult || !sendResult.success) {
              console.error(`Error in send-email function on attempt ${attemptCount}:`, sendResult?.error || "Unknown error");
              lastError = sendResult?.error || new Error("Unknown error in send-email function");
              // Wait a moment before retrying
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            // No errors, mark as success
            success = true;
            console.log(`Successfully sent email on attempt ${attemptCount}`);
          } catch (error) {
            console.error(`Exception on attempt ${attemptCount}:`, error);
            lastError = error;
            // Wait a moment before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (success) {
          // Sucesso no envio - atualizar status do agendamento
          await supabaseAdmin
            .from('agendamentos')
            .update({ status: 'enviado' })
            .eq('id', agendamento.id);
          
          console.log(`Successfully sent scheduled email ${agendamento.id}`);
          
          results.push({
            id: agendamento.id,
            status: 'enviado'
          });
          
          // Create entry in envios table
          await supabaseAdmin
            .from('envios')
            .insert({
              user_id: agendamento.user_id,
              template_id: agendamento.template_id,
              contato_id: agendamento.contato_id,
              status: 'enviado',
              data_envio: new Date().toISOString()
            });
        } else {
          // Todas as tentativas falharam - atualizar status do agendamento para erro
          const errorMessage = lastError ? 
            (typeof lastError === 'string' ? lastError : JSON.stringify(lastError)) : 
            'Falha após múltiplas tentativas';
          
          await supabaseAdmin
            .from('agendamentos')
            .update({ 
              status: 'erro',
              erro: errorMessage
            })
            .eq('id', agendamento.id);
          
          console.error(`Failed to send scheduled email ${agendamento.id} after ${maxAttempts} attempts`);
          
          results.push({
            id: agendamento.id,
            status: 'erro',
            error: errorMessage
          });
        }
      } catch (error: any) {
        console.error(`Error processing agendamento ${agendamento.id}:`, error);
        
        // Atualizar status do agendamento para erro
        await supabaseAdmin
          .from('agendamentos')
          .update({ 
            status: 'erro',
            erro: error.message || 'Erro desconhecido'
          })
          .eq('id', agendamento.id);
        
        results.push({
          id: agendamento.id,
          status: 'erro',
          error: error.message || 'Erro desconhecido'
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error: any) {
    console.error("Error in process-scheduled-emails function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido ao processar agendamentos",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
