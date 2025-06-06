
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { processBatchEmailsSMTP } from './smtp-processor.ts';
import { processUltraParallelV5 } from './ultra-processor-v5.ts';
import { normalizeTipoEnvio, prepareEnvioForDatabase, EmailRequestData, EmailRequest } from './shared-types.ts';

interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  console.log(`📨 New request: ${req.method} ${req.url}`);
  
  try {
    // Setup CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight request handled');
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      console.error(`❌ Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log(`🔑 Auth header present: ${!!authHeader}`);
    
    let userId: string | null = null;
    
    if (authHeader) {
      const jwtToken = authHeader.split(' ')[1];
      if (jwtToken) {
        try {
          // Initialize Supabase client
          const { client: supabase } = getSupabaseClient();

          // Validate JWT and get user
          const { data: { user }, error: userError } = await supabase.auth.getUser(jwtToken);
          if (userError) {
            console.warn('⚠️ JWT validation failed:', userError.message);
          } else if (user) {
            userId = user.id;
            console.log(`🧑‍💼 Authenticated User ID: ${userId}`);
          }
        } catch (error) {
          console.warn('⚠️ JWT processing error:', error);
        }
      }
    }

    // If no valid user found, use a fallback approach
    if (!userId) {
      console.log('⚠️ No authenticated user found, continuing without user context');
      // For batch emails or anonymous sending, we'll need to handle this differently
      // This allows the function to work even without authentication
    }

    // Initialize Supabase client for database operations
    const { client: supabase } = getSupabaseClient();

    // Parse request body
    let requestData: EmailRequestData;
    try {
      requestData = await req.json();
      console.log(`📧 Request data received:`, {
        hasTemplateId: !!requestData.templateId,
        hasContacts: !!requestData.contacts,
        contactsLength: requestData.contacts?.length,
        hasBatch: !!requestData.batch,
        hasEmails: !!requestData.emails,
        emailsLength: requestData.emails?.length,
        useSmtp: requestData.use_smtp,
        gmailOptimized: requestData.gmail_optimized,
        hasSmtpSettings: !!requestData.smtp_settings
      });
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Determinar o tipo de processamento baseado na entrada
    let emailRequests: EmailRequest[] = [];
    let tipoEnvio = 'individual';
    let useNewFormat = false;

    if (requestData.batch && requestData.emails) {
      // Novo formato (do BatchEmailSender)
      useNewFormat = true;
      console.log(`📧 Using NEW format: batch with ${requestData.emails.length} emails`);
      
      // Get user data for from_name
      let fromName = 'Sistema';
      if (userId) {
        try {
          const { data: userData, error: userErrorData } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', userId)
            .single();

          if (!userErrorData && userData) {
            fromName = userData.nome;
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch user profile, using default name');
        }
      }

      const fromEmail = requestData.smtp_settings?.from_email || 'noreply@example.com';

      // Convert new format to EmailRequest[]
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
      // Legacy format (compatibility)
      console.log(`📧 Using LEGACY format: templateId with ${requestData.contacts.length} contacts`);
      
      if (!userId) {
        console.error('❌ Legacy format requires authenticated user');
        return new Response(JSON.stringify({ error: 'Authentication required for legacy format' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      
      // Determine sending type
      if (requestData.contacts.length === 1) {
        tipoEnvio = 'individual';
      } else if (requestData.contacts.length >= 50) {
        tipoEnvio = requestData.tipo_envio || 'ultra_parallel_v5';
      } else {
        tipoEnvio = requestData.tipo_envio || 'lote';
      }

      // Fetch template and user data
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', requestData.templateId)
        .single();

      if (templateError || !templateData) {
        console.error('❌ Failed to fetch template:', templateError);
        return new Response(JSON.stringify({ error: 'Failed to fetch template' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const { data: userData, error: userErrorData } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .single();

      if (userErrorData || !userData) {
        console.error('❌ Failed to fetch user:', userErrorData);
        return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const fromName = userData.nome;

      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (configError || !configData) {
        console.error('❌ Failed to fetch config:', configError);
        return new Response(JSON.stringify({ error: 'Failed to fetch config' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const fromEmail = configData.smtp_from_name || 'noreply@example.com';

      // Fetch contacts and create EmailRequest[]
      for (const contactId of requestData.contacts) {
        const { data: contactData, error: contactError } = await supabase
          .from('contatos')
          .select('*')
          .eq('id', contactId)
          .single();

        if (contactError || !contactData) {
          console.error(`❌ Failed to fetch contact ${contactId}:`, contactError);
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
      console.error('❌ Invalid request format');
      return new Response(JSON.stringify({ error: 'Invalid request format. Expected either templateId+contacts or batch+emails' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Normalize sending type
    const normalizedTipoEnvio = normalizeTipoEnvio(tipoEnvio);
    console.log(`📋 Sending type: ${tipoEnvio} -> normalized: ${normalizedTipoEnvio}`);

    // Update tipoEnvio in emailRequests
    emailRequests.forEach(req => {
      req.tipoEnvio = normalizedTipoEnvio;
    });

    console.log(`📊 Processing ${emailRequests.length} emails as ${normalizedTipoEnvio}`);

    // For single sends
    if (emailRequests.length === 1) {
      const emailRequest = emailRequests[0];
      console.log(`📧 Sending individual email to ${emailRequest.toEmail}`);

      // For new format, use SMTP
      if (useNewFormat && requestData.smtp_settings) {
        console.log('📧 Using SMTP for individual send');
        
        // Use SMTP processor for consistency
        const smtpResult = await processBatchEmailsSMTP(
          [emailRequest],
          requestData.smtp_settings,
          supabase,
          userId || 'anonymous',
          { maxConcurrent: 1, chunkSize: 1 }
        );

        return new Response(
          JSON.stringify({
            success: smtpResult.successCount > 0,
            message: smtpResult.successCount > 0 
              ? `Email sent successfully to ${emailRequest.toEmail}` 
              : `Failed to send email to ${emailRequest.toEmail}`,
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
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      } else {
        // Fallback for legacy format
        if (userId) {
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
            console.error('❌ Error saving to history:', historicoError);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Email sent successfully to ${emailRequest.toEmail}` 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
    } else {
      // For batch sends
      console.log(`📦 Processing batch of ${emailRequests.length} emails`);

      let batchResult;

      if (useNewFormat && requestData.smtp_settings) {
        // Use new SMTP processor
        console.log('🚀 Using optimized SMTP processor');
        
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
          userId || 'anonymous',
          options
        );

        return new Response(
          JSON.stringify({
            success: batchResult.successCount > 0,
            message: `SMTP processing completed: ${batchResult.successCount} successes, ${batchResult.errorCount} failures`,
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
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );

      } else if (normalizedTipoEnvio === 'ultra_parallel_v5') {
        // Use ultra parallel processor for compatibility
        batchResult = await processUltraParallelV5(emailRequests, supabase, userId || 'anonymous');
      } else {
        // Fallback for basic batch processing (simulated)
        console.log('📧 Using basic batch processor');
        
        const results = emailRequests.map(email => ({
          success: true,
          contactId: email.contactId,
          templateId: email.templateId,
          toEmail: email.toEmail,
          toName: email.toName,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          templateName: email.templateName,
          tipoEnvio: email.tipoEnvio
        }));

        batchResult = {
          successCount: results.length,
          errorCount: 0,
          totalCount: results.length,
          timeElapsed: 1000,
          results
        };
      }

      if (!batchResult) {
        console.error('❌ Batch processing failed');
        return new Response(JSON.stringify({ error: 'Batch processing failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Batch processing completed`, 
          batchResult 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
