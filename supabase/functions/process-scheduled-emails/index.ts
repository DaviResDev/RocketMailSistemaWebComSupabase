
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledEmail {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  user_id: string;
  contato?: {
    nome: string;
    email: string;
    telefone?: string;
    razao_social?: string;
    cliente?: string;
  };
  template?: {
    nome: string;
    conteudo: string;
    canal: string;
    assinatura?: string;
    signature_image?: string;
    attachments?: any;
  };
}

interface ProcessingOptions {
  useParallelProcessing?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando processamento de emails agendados...");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body for options
    let options: ProcessingOptions = {
      useParallelProcessing: true,
      batchSize: 20,
      delayBetweenBatches: 50
    };

    try {
      const body = await req.text();
      if (body) {
        const parsed = JSON.parse(body);
        options = { ...options, ...parsed };
      }
    } catch (e) {
      // If no body or invalid JSON, use defaults
    }

    // Buscar agendamentos pendentes que devem ser enviados agora
    const now = new Date().toISOString();
    console.log(`📅 Buscando agendamentos para envio até: ${now}`);
    
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('agendamentos')
      .select(`
        *,
        contato:contatos (
          nome,
          email,
          telefone,
          razao_social,
          cliente
        ),
        template:templates (
          nome,
          conteudo,
          canal,
          assinatura,
          signature_image,
          attachments
        )
      `)
      .eq('status', 'pendente')
      .lte('data_envio', now)
      .limit(100); // Increased limit for better throughput

    if (fetchError) {
      console.error("❌ Erro ao buscar agendamentos:", fetchError);
      throw fetchError;
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log("✅ Nenhum agendamento pendente encontrado");
      return new Response(
        JSON.stringify({ 
          processed: 0,
          successful: 0,
          failed: 0,
          message: "Nenhum agendamento pendente encontrado"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📧 Encontrados ${scheduledEmails.length} agendamentos para processar`);
    console.log(`⚙️ Processamento paralelo: ${options.useParallelProcessing ? 'ATIVADO' : 'DESATIVADO'}`);
    console.log(`📦 Tamanho do lote: ${options.batchSize}`);

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const startTime = Date.now();

    if (options.useParallelProcessing && scheduledEmails.length >= 5) {
      console.log(`🚀 Processando ${scheduledEmails.length} agendamentos em modo paralelo`);
      
      // Process in parallel batches
      for (let i = 0; i < scheduledEmails.length; i += options.batchSize!) {
        const batch = scheduledEmails.slice(i, i + options.batchSize!) as ScheduledEmail[];
        console.log(`📦 Processando lote ${Math.floor(i / options.batchSize!) + 1} com ${batch.length} agendamentos`);
        
        // Process all emails in this batch simultaneously
        const batchPromises = batch.map(async (schedule) => {
          return await processScheduledEmail(schedule, supabase);
        });

        // Wait for all emails in this batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successful++;
              console.log(`✅ Agendamento ${batch[index].id} processado com sucesso`);
            } else {
              failed++;
              errors.push(`Agendamento ${batch[index].id}: ${result.value.error}`);
              console.log(`❌ Falha no agendamento ${batch[index].id}: ${result.value.error}`);
            }
          } else {
            failed++;
            errors.push(`Agendamento ${batch[index].id}: ${result.reason}`);
            console.log(`❌ Erro crítico no agendamento ${batch[index].id}: ${result.reason}`);
          }
        });

        // Small delay between batches to prevent overwhelming the system
        if (i + options.batchSize! < scheduledEmails.length) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
      }
    } else {
      console.log(`⏳ Processando ${scheduledEmails.length} agendamentos sequencialmente`);
      
      // Sequential processing
      for (const schedule of scheduledEmails as ScheduledEmail[]) {
        const result = await processScheduledEmail(schedule, supabase);
        
        if (result.success) {
          successful++;
          console.log(`✅ Agendamento ${schedule.id} processado com sucesso`);
        } else {
          failed++;
          errors.push(`Agendamento ${schedule.id}: ${result.error}`);
          console.log(`❌ Falha no agendamento ${schedule.id}: ${result.error}`);
        }
        
        // Small delay between emails in sequential mode
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = Date.now() - startTime;
    const throughput = Math.round((scheduledEmails.length / totalTime) * 1000);

    const result = {
      processed: scheduledEmails.length,
      successful,
      failed,
      processingTime: `${totalTime}ms`,
      throughput: `${throughput} emails/seg`,
      parallelProcessing: options.useParallelProcessing,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`📊 Processamento concluído:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error: any) {
    console.error("❌ Erro geral no processamento de agendamentos:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno no processamento de agendamentos",
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function processScheduledEmail(schedule: ScheduledEmail, supabase: any) {
  try {
    // Validate required data
    if (!schedule.contato?.email) {
      throw new Error("Contato não possui email válido");
    }

    if (!schedule.template?.conteudo) {
      throw new Error("Template não possui conteúdo");
    }

    // Prepare email data
    const emailData = {
      to: schedule.contato.email,
      subject: schedule.template.nome || "Email Agendado",
      content: schedule.template.conteudo,
      contato_nome: schedule.contato.nome,
      contato_email: schedule.contato.email,
      template_id: schedule.template_id,
      contato_id: schedule.contato_id,
      agendamento_id: schedule.id,
      signature_image: schedule.template.signature_image,
      attachments: schedule.template.attachments
    };

    // Call the send-email function
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-email', {
      body: emailData
    });

    if (sendError) {
      throw new Error(`Falha no envio: ${sendError.message}`);
    }

    if (!sendResult?.success) {
      throw new Error(`Falha no envio: ${sendResult?.error || 'Erro desconhecido'}`);
    }

    // Mark agendamento as processed
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ status: 'enviado' })
      .eq('id', schedule.id);

    if (updateError) {
      console.error(`⚠️ Erro ao atualizar status do agendamento ${schedule.id}:`, updateError);
      // Don't fail here, as the email was sent successfully
    }

    return { success: true };

  } catch (error: any) {
    // Mark agendamento as failed
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ status: 'erro' })
      .eq('id', schedule.id);

    if (updateError) {
      console.error(`⚠️ Erro ao atualizar status de falha do agendamento ${schedule.id}:`, updateError);
    }

    return { success: false, error: error.message };
  }
}
