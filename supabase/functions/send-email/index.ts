
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { processBatchEmailsSMTP } from './smtp-processor.ts';
import { processUltraParallelV5 } from './ultra-processor-v5.ts';
import { normalizeTipoEnvio, prepareEnvioForDatabase, EmailRequestData, EmailRequest } from './shared-types.ts';

interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

function getSupabaseClient(): { client: any, env: SupabaseEnv } {
  const env = Deno.env.toObject();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("🚨 SUPABASE_URL or SUPABASE_ANON_KEY not found in environment variables.");
    throw new Error("Missing Supabase credentials");
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false
    }
  });

  return { client, env };
}

serve(async (req) => {
  try {
    // Setup CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const jwtToken = authHeader.split(' ')[1];
    if (!jwtToken) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const { client: supabase, env } = getSupabaseClient();

    // Validate JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwtToken);
    if (userError || !user) {
      console.error('JWT is invalid:', userError);
      return new Response(JSON.stringify({ error: 'JWT is invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log(`🧑‍💼 User ID: ${userId}`);

    // Parse request body
    const requestData: EmailRequestData = await req.json();
    console.log(`📨 Request data recebido:`, {
      hasTemplateId: !!requestData.templateId,
      hasContacts: !!requestData.contacts,
      contactsLength: requestData.contacts?.length,
      hasBatch: !!requestData.batch,
      hasEmails: !!requestData.emails,
      emailsLength: requestData.emails?.length,
      useSmtp: requestData.use_smtp,
      gmailOptimized: requestData.gmail_optimized
    });

    // Determinar o tipo de processamento baseado na entrada
    let emailRequests: EmailRequest[] = [];
    let tipoEnvio = 'individual';
    let useNewFormat = false;

    if (requestData.batch && requestData.emails) {
      // Novo formato (do BatchEmailSender)
      useNewFormat = true;
      console.log(`📧 Usando NOVO formato: batch com ${requestData.emails.length} emails`);
      
      // Buscar dados do usuário para from_name
      const { data: userData, error: userErrorData } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .single();

      if (userErrorData || !userData) {
        console.error('Failed to fetch user:', userErrorData);
        return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const fromName = userData.nome;
      const fromEmail = requestData.smtp_settings?.from_email || 'noreply@example.com';

      // Converter formato novo para EmailRequest[]
      emailRequests = requestData.emails.map(email => ({
        templateId: email.template_id,
        contactId: email.contato_id,
        fromName: fromName,
        fromEmail: fromEmail,
        toName: email.contato_nome,
        toEmail: email.to,
        subject: email.subject,
        content: email.content,
        tipoEnvio: requestData.gmail_optimized ? 'gmail_optimized_v4' : 'lote',
        templateName: email.template_nome
      }));

      tipoEnvio = requestData.gmail_optimized ? 'gmail_optimized_v4' : 'lote';
      
    } else if (requestData.templateId && requestData.contacts) {
      // Formato antigo (compatibilidade)
      console.log(`📧 Usando formato ANTIGO: templateId com ${requestData.contacts.length} contatos`);
      
      // Determinar tipo de envio
      if (requestData.contacts.length === 1) {
        tipoEnvio = 'individual';
      } else if (requestData.contacts.length >= 50) {
        tipoEnvio = requestData.tipo_envio || 'ultra_parallel_v5';
      } else {
        tipoEnvio = requestData.tipo_envio || 'lote';
      }

      // Buscar template e dados do usuário
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', requestData.templateId)
        .single();

      if (templateError || !templateData) {
        console.error('Failed to fetch template:', templateError);
        return new Response(JSON.stringify({ error: 'Failed to fetch template' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: userData, error: userErrorData } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .single();

      if (userErrorData || !userData) {
        console.error('Failed to fetch user:', userErrorData);
        return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const fromName = userData.nome;

      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (configError || !configData) {
        console.error('Failed to fetch config:', configError);
        return new Response(JSON.stringify({ error: 'Failed to fetch config' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const fromEmail = configData.smtp_from_name || 'noreply@example.com';

      // Buscar contatos e criar EmailRequest[]
      for (const contactId of requestData.contacts) {
        const { data: contactData, error: contactError } = await supabase
          .from('contatos')
          .select('*')
          .eq('id', contactId)
          .single();

        if (contactError || !contactData) {
          console.error(`Failed to fetch contact ${contactId}:`, contactError);
          continue;
        }

        emailRequests.push({
          templateId: requestData.templateId,
          contactId: contactId,
          subject: requestData.subject,
          content: requestData.content,
          fromName: fromName,
          fromEmail: fromEmail,
          toName: contactData.nome,
          toEmail: contactData.email,
          tipoEnvio: tipoEnvio,
          templateName: templateData.nome || null
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid request format. Expected either templateId+contacts or batch+emails' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normalizar o tipo de envio
    const normalizedTipoEnvio = normalizeTipoEnvio(tipoEnvio);
    console.log(`📋 Tipo de envio: ${tipoEnvio} -> normalizado: ${normalizedTipoEnvio}`);

    // Atualizar tipoEnvio nos emailRequests
    emailRequests.forEach(req => {
      req.tipoEnvio = normalizedTipoEnvio;
    });

    console.log(`📊 Processando ${emailRequests.length} emails como ${normalizedTipoEnvio}`);

    // Para envios únicos
    if (emailRequests.length === 1) {
      const emailRequest = emailRequests[0];
      console.log(`📧 Enviando email individual para ${emailRequest.toEmail}`);

      // Para formato novo, usar SMTP
      if (useNewFormat && requestData.smtp_settings) {
        console.log('📧 Usando SMTP para envio individual');
        
        // Usar o processador SMTP para consistência
        const smtpResult = await processBatchEmailsSMTP(
          [emailRequest],
          requestData.smtp_settings,
          supabase,
          userId,
          { maxConcurrent: 1, chunkSize: 1 }
        );

        return new Response(
          JSON.stringify({
            success: smtpResult.successCount > 0,
            message: smtpResult.successCount > 0 
              ? `Email enviado com sucesso para ${emailRequest.toEmail}` 
              : `Falha ao enviar email para ${emailRequest.toEmail}`,
            summary: {
              successful: smtpResult.successCount,
              failed: smtpResult.errorCount,
              totalDuration: Math.round(smtpResult.timeElapsed / 1000),
              avgThroughput: smtpResult.avgThroughput || 0,
              successRate: smtpResult.successRate || '0'
            },
            results: smtpResult.results
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else {
        // Fallback para formato antigo
        const historicoData = prepareEnvioForDatabase({
          user_id: userId,
          template_id: emailRequest.templateId,
          contato_id: emailRequest.contactId,
          remetente_nome: emailRequest.fromName,
          remetente_email: emailRequest.fromEmail,
          destinatario_nome: emailRequest.toName,
          destinatario_email: emailRequest.toEmail,
          status: 'entregue',
          tipo_envio: normalizedTipoEnvio,
          template_nome: emailRequest.templateName || null,
          data_envio: new Date().toISOString()
        });

        const { error: historicoError } = await supabase
          .from('envios_historico')
          .insert([historicoData]);

        if (historicoError) {
          console.error('Erro ao salvar no histórico:', historicoError);
        }

        return new Response(
          JSON.stringify({ message: `Email sent successfully to ${emailRequest.toEmail}` }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Para envios em lote
      console.log(`📦 Processando lote de ${emailRequests.length} emails`);

      let batchResult;

      if (useNewFormat && requestData.smtp_settings) {
        // Usar novo processador SMTP
        console.log('🚀 Usando processador SMTP otimizado');
        
        const options = {
          maxConcurrent: requestData.max_concurrent || 15,
          chunkSize: requestData.chunk_size || 25,
          delayBetweenChunks: 2000,
          targetThroughput: requestData.target_throughput || 12
        };

        batchResult = await processBatchEmailsSMTP(
          emailRequests,
          requestData.smtp_settings,
          supabase,
          userId,
          options
        );

        return new Response(
          JSON.stringify({
            success: batchResult.successCount > 0,
            message: `Processamento SMTP concluído: ${batchResult.successCount} sucessos, ${batchResult.errorCount} falhas`,
            summary: {
              successful: batchResult.successCount,
              failed: batchResult.errorCount,
              totalDuration: Math.round(batchResult.timeElapsed / 1000),
              avgThroughput: batchResult.avgThroughput || 0,
              successRate: batchResult.successRate || '0',
              avgEmailDuration: batchResult.timeElapsed / batchResult.totalCount
            },
            results: batchResult.results,
            errorTypes: {}
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );

      } else if (normalizedTipoEnvio === 'ultra_parallel_v5') {
        // Usar processador ultra paralelo para compatibilidade
        batchResult = await processUltraParallelV5(emailRequests, supabase, userId);
      } else {
        // Fallback para processador básico (não implementado ainda, retorna erro)
        return new Response(JSON.stringify({ error: 'Batch processing without SMTP not implemented' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!batchResult) {
        return new Response(JSON.stringify({ error: 'Batch processing failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ message: `Batch processing completed`, batchResult }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
