
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

// Enhanced batch processing with better rate limiting and error handling
async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 3, // Reduced from 10 for better stability
  delayBetweenBatches: number = 2000 // Increased to 2 seconds for better rate limiting
): Promise<BatchResult<R>[]> {
  const results: BatchResult<R>[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  console.log(`Processing ${items.length} items in batches of ${batchSize} with ${delayBetweenBatches}ms delay`);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.length} items)`);
    
    // Process items in sequence within each batch to avoid overwhelming the API
    for (let j = 0; j < batch.length; j++) {
      const item: any = batch[j];
      const globalIndex = batchStartIndex + j;
      
      try {
        const result = await processor(item, globalIndex);
        results.push({
          success: true,
          result,
          index: globalIndex,
          id: item.id
        } as BatchResult<R>);
        
        // Small delay between items within the same batch
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.error(`Error processing item ${globalIndex}:`, error);
        results.push({
          success: false,
          error: error.message || 'Erro desconhecido',
          index: globalIndex,
          id: item.id
        });
      }
    }
    
    // Delay between batches for rate limiting
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
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
    
    // Fetch pending schedules that should be sent now
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
      .lte('data_envio', now)
      .limit(50); // Limit to prevent overwhelming the system
      
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
    
    console.log(`Processing ${agendamentos.length} scheduled emails with enhanced error handling...`);
    
    // Process emails with improved batch settings and error handling
    const results = await processBatch(
      agendamentos,
      async (agendamento: any) => {
        // Validate required data
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
        
        // Process attachments safely
        let attachments = null;
        if (agendamento.template.attachments) {
          try {
            if (typeof agendamento.template.attachments === 'string') {
              // Only parse if it's not an empty string or empty array
              if (agendamento.template.attachments.trim() && agendamento.template.attachments !== '[]') {
                attachments = JSON.parse(agendamento.template.attachments);
              }
            } else if (Array.isArray(agendamento.template.attachments)) {
              attachments = agendamento.template.attachments;
            } else if (agendamento.template.attachments && typeof agendamento.template.attachments === 'object') {
              attachments = agendamento.template.attachments;
            }
            
            // Validate attachment structure
            if (attachments && Array.isArray(attachments)) {
              attachments = attachments.filter(att => {
                if (!att || typeof att !== 'object') return false;
                const hasName = att.name || att.filename;
                const hasContent = att.content || att.url || att.path;
                if (!hasName || !hasContent) {
                  console.warn(`Filtering out invalid attachment:`, att);
                  return false;
                }
                return true;
              });
              
              if (attachments.length === 0) {
                attachments = null;
              }
            } else if (attachments && typeof attachments === 'object') {
              // Single attachment object
              const hasName = attachments.name || attachments.filename;
              const hasContent = attachments.content || attachments.url || attachments.path;
              if (!hasName || !hasContent) {
                console.warn(`Invalid single attachment:`, attachments);
                attachments = null;
              }
            }
          } catch (e) {
            console.error("Error parsing attachments:", e);
            attachments = null;
          }
        }
        
        const currentDate = new Date();
        const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
        const formattedTime = `${currentDate.toLocaleTimeString('pt-BR')}`;
        
        // Process template with actual contact data
        let processedContent = agendamento.template.conteudo
          .replace(/\{\{nome\}\}/g, agendamento.contato.nome || "")
          .replace(/\{\{email\}\}/g, agendamento.contato.email || "")
          .replace(/\{\{telefone\}\}/g, agendamento.contato.telefone || "")
          .replace(/\{\{data\}\}/g, formattedDate)
          .replace(/\{\{hora\}\}/g, formattedTime);
        
        // Enhanced retry logic with exponential backoff
        let attemptCount = 0;
        const maxAttempts = 3;
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
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attemptCount - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              throw sendError;
            }
            
            if (!sendResult || !sendResult.success) {
              const error = new Error(sendResult?.error || "Unknown error in send-email function");
              console.error(`Error in send-email function on attempt ${attemptCount}:`, error.message);
              lastError = error;
              if (attemptCount < maxAttempts) {
                const delay = Math.pow(2, attemptCount - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
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
              const delay = Math.pow(2, attemptCount - 1) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
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
      3, // Smaller batch size for better stability
      2000 // 2 second delay between batches
    );
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`Enhanced batch processing complete: ${successCount} successful, ${errorCount} failed`);
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        successful: successCount,
        failed: errorCount,
        enhanced: true,
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
    console.error("Error in enhanced process-scheduled-emails function:", error);
    
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
