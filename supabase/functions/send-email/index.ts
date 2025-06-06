import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { processBatchEmails } from './batch-processor.ts';
import { processUltraParallelV5 } from './ultra-processor-v5.ts';
import { normalizeTipoEnvio, prepareEnvioForDatabase } from './shared-types.ts';

interface EmailRequestData {
  templateId: string;
  contacts: string[];
  subject?: string;
  content?: string;
  tipo_envio?: string;
}

interface EmailRequest {
  templateId: string;
  contactId: string;
  subject?: string;
  content?: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  tipoEnvio?: string;
  templateName?: string;
}

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
    console.log(`📨 Request data: ${JSON.stringify(requestData)}`);

    if (!requestData.templateId || !requestData.contacts) {
      return new Response(JSON.stringify({ error: 'Missing templateId or contacts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determinar tipo de envio com normalização
    let tipoEnvio = 'individual';
    if (requestData.contacts && requestData.contacts.length > 1) {
      if (requestData.contacts.length >= 50) {
        tipoEnvio = requestData.tipo_envio || 'ultra_parallel_v5';
      } else {
        tipoEnvio = requestData.tipo_envio || 'lote';
      }
    } else {
      tipoEnvio = requestData.tipo_envio || 'individual';
    }

    // Normalizar o tipo de envio
    const normalizedTipoEnvio = normalizeTipoEnvio(tipoEnvio);
    console.log(`📋 Tipo de envio: ${tipoEnvio} -> normalizado: ${normalizedTipoEnvio}`);

    // Fetch template and contact details
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

    // Prepare email requests
    const emailRequests: EmailRequest[] = [];

    for (const contactId of requestData.contacts) {
      const { data: contactData, error: contactError } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError || !contactData) {
        console.error(`Failed to fetch contact ${contactId}:`, contactError);
        return new Response(JSON.stringify({ error: `Failed to fetch contact ${contactId}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
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

    // Para envios únicos
    if (emailRequests.length === 1) {
      // Single email processing logic
      const toEmail = emailRequests[0].toEmail;
      const toName = emailRequests[0].toName;

      console.log(`📧 Enviando email para ${toEmail} (${toName})`);

      // Salvar no histórico com tipo normalizado
      const historicoData = prepareEnvioForDatabase({
        user_id: userId,
        template_id: emailRequests[0].templateId,
        contato_id: emailRequests[0].contactId,
        remetente_nome: emailRequests[0].fromName,
        remetente_email: emailRequests[0].fromEmail,
        destinatario_nome: emailRequests[0].toName,
        destinatario_email: emailRequests[0].toEmail,
        status: 'entregue',
        tipo_envio: normalizedTipoEnvio,
        template_nome: emailRequests[0].templateName || null,
        data_envio: new Date().toISOString()
      });

      const { error: historicoError } = await supabase
        .from('envios_historico')
        .insert([historicoData]);

      if (historicoError) {
        console.error('Erro ao salvar no histórico:', historicoError);
      }

      return new Response(
        JSON.stringify({ message: `Email sent successfully to ${toEmail}` }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Para envios em lote - passar o tipo normalizado
      emailRequests.forEach(req => {
        req.tipoEnvio = normalizedTipoEnvio;
      });

      // Batch email processing logic
      let batchResult;
      if (normalizedTipoEnvio === 'ultra_parallel_v5') {
        batchResult = await processUltraParallelV5(emailRequests, supabase, userId);
      } else {
        batchResult = await processBatchEmails(emailRequests, supabase, userId);
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
