
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

interface UserSettings {
  use_smtp: boolean;
  smtp_host?: string;
  email_porta?: number;
  email_usuario?: string;
  smtp_pass?: string;
  smtp_seguranca?: string;
  smtp_from_name?: string;
  smtp_nome?: string;
  signature_image?: string;
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
      .limit(50); // Processar no máximo 50 por vez

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

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Processar cada agendamento
    for (const schedule of scheduledEmails as ScheduledEmail[]) {
      try {
        console.log(`📤 Processando agendamento ${schedule.id} para ${schedule.contato?.email}`);
        
        // Buscar configurações do usuário
        const { data: userSettings, error: settingsError } = await supabase
          .from('configuracoes')
          .select('*')
          .eq('user_id', schedule.user_id)
          .maybeSingle();

        if (settingsError) {
          console.error(`❌ Erro ao buscar configurações do usuário ${schedule.user_id}:`, settingsError);
          throw new Error(`Erro ao buscar configurações: ${settingsError.message}`);
        }

        // Validar dados necessários
        if (!schedule.contato?.email) {
          throw new Error("Contato não possui email válido");
        }

        if (!schedule.template?.conteudo) {
          throw new Error("Template não possui conteúdo");
        }

        // Preparar dados do email
        const emailData = {
          to: schedule.contato.email,
          subject: schedule.template.nome || "Email Agendado",
          content: schedule.template.conteudo,
          contato_nome: schedule.contato.nome,
          contato_email: schedule.contato.email,
          template_id: schedule.template_id,
          contato_id: schedule.contato_id,
          agendamento_id: schedule.id,
          signature_image: userSettings?.signature_image || schedule.template.signature_image,
          attachments: schedule.template.attachments
        };

        // Chamar a função send-email
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-email', {
          body: emailData
        });

        if (sendError) {
          console.error(`❌ Erro ao enviar email para ${schedule.contato.email}:`, sendError);
          throw new Error(`Falha no envio: ${sendError.message}`);
        }

        if (!sendResult?.success) {
          console.error(`❌ Falha no envio para ${schedule.contato.email}:`, sendResult);
          throw new Error(`Falha no envio: ${sendResult?.error || 'Erro desconhecido'}`);
        }

        // Marcar agendamento como processado
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ 
            status: 'enviado'
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`⚠️ Erro ao atualizar status do agendamento ${schedule.id}:`, updateError);
          // Não falhar aqui, pois o email foi enviado com sucesso
        }

        console.log(`✅ Email agendado enviado com sucesso para ${schedule.contato.email}`);
        successful++;

      } catch (error: any) {
        console.error(`❌ Erro ao processar agendamento ${schedule.id}:`, error);
        
        // Marcar agendamento como falhado
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ 
            status: 'erro'
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`⚠️ Erro ao atualizar status de falha do agendamento ${schedule.id}:`, updateError);
        }

        failed++;
        errors.push(`Agendamento ${schedule.id}: ${error.message}`);
      }
    }

    const result = {
      processed: scheduledEmails.length,
      successful,
      failed,
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
