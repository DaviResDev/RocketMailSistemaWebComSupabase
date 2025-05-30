
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  index: number;
  id: string;
}

async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 3,
  delayBetweenBatches: number = 500
): Promise<BatchResult<R>[]> {
  const results: BatchResult<R>[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(items.length / batchSize)} (${batch.length} items)`);
    
    const batchPromises = batch.map(async (item: any, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      try {
        const result = await processor(item, globalIndex);
        return {
          success: true,
          result,
          index: globalIndex,
          id: item.id
        } as BatchResult<R>;
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          index: globalIndex,
          id: item.id
        } as BatchResult<R>;
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || 'Erro durante processamento',
          index: results.length,
          id: 'unknown'
        });
      }
    });
    
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
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
    
    // Process emails in batches
    const results = await processBatch(
      agendamentos,
      async (agendamento: any) => {
        if (!agendamento.contato || !agendamento.template) {
          console.error(`Skipping agendamento ${agendamento.id} - missing contato or template`);
          
          await supabaseAdmin
            .from('agendamentos')
            .update({ 
              status: 'erro',
              erro: 'Contato ou template não encontrado'
            })
            .eq('id', agendamento.id);
          
          throw new Error('Contato ou template não encontrado');
        }
        
        if (!agendamento.contato.email || !agendamento.template.conteudo) {
          console.error(`Skipping agendamento ${agendamento.id} - missing email or content`);
          
          await supabaseAdmin
            .from('agendamentos')
            .update({ 
              status: 'erro',
              erro: 'Email do contato ou conteúdo do template não encontrado'
            })
            .eq('id', agendamento.id);
          
          throw new Error('Email do contato ou conteúdo do template não encontrado');
        }
        
        console.log(`Processing scheduled email for ${agendamento.contato.email}`);
        
        // Get user settings for signature
        const { data: userSettings, error: settingsError } = await supabaseAdmin
          .from('configuracoes')
          .select('signature_image')
          .eq('user_id', agendamento.user_id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.warn(`Could not fetch user settings: ${settingsError.message}`);
        }
        
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
        
        // Send email with retry logic
        let attemptCount = 0;
        const maxAttempts = 2;
        let lastError = null;
        
        while (attemptCount < maxAttempts) {
          attemptCount++;
          
          try {
            console.log(`Attempt ${attemptCount} to send email to ${agendamento.contato.email}`);
            
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
              if (attemptCount < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }
              throw sendError;
            }
            
            if (!sendResult || !sendResult.success) {
              const error = new Error(sendResult?.error || "Unknown error in send-email function");
              console.error(`Error in send-email function on attempt ${attemptCount}:`, error.message);
              lastError = error;
              if (attemptCount < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }
              throw error;
            }
            
            // Success - update status and create envio record
            await supabaseAdmin
              .from('agendamentos')
              .update({ status: 'enviado' })
              .eq('id', agendamento.id);
            
            await supabaseAdmin
              .from('envios')
              .insert({
                user_id: agendamento.user_id,
                template_id: agendamento.template_id,
                contato_id: agendamento.contato_id,
                status: 'enviado',
                data_envio: new Date().toISOString()
              });
            
            console.log(`Successfully sent scheduled email ${agendamento.id}`);
            return { success: true, id: agendamento.id };
            
          } catch (error: any) {
            console.error(`Exception on attempt ${attemptCount}:`, error);
            lastError = error;
            if (attemptCount < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        // All attempts failed
        const errorMessage = lastError ? 
          (typeof lastError === 'string' ? lastError : lastError.message || JSON.stringify(lastError)) : 
          'Falha após múltiplas tentativas';
        
        await supabaseAdmin
          .from('agendamentos')
          .update({ 
            status: 'erro',
            erro: errorMessage
          })
          .eq('id', agendamento.id);
        
        throw new Error(errorMessage);
      },
      3, // Batch size of 3 for email sending
      800 // 800ms delay between batches
    );
    
    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`Batch processing complete: ${successCount} successful, ${errorCount} failed`);
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        successful: successCount,
        failed: errorCount,
        results: results.map(r => ({
          id: r.id,
          success: r.success,
          error: r.error
        }))
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
