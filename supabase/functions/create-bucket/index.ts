import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseAdmin = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API SERVICE ROLE KEY - env var exported by default.
      // WARNING: The service key has admin privileges and should only be used in secure server environments!
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabaseAdmin
      .storage
      .listBuckets();
      
    if (bucketError) {
      throw bucketError;
    }
    
    // Check if template_attachments bucket exists
    const templateAttachmentsBucket = buckets?.find(bucket => bucket.name === 'template_attachments');
    
    if (!templateAttachmentsBucket) {
      // Create template_attachments bucket
      const { data: newBucket, error: createError } = await supabaseAdmin
        .storage
        .createBucket('template_attachments', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
      
      if (createError) {
        throw createError;
      }
      
      console.log('Created template_attachments bucket:', newBucket);
      
      // Create a folder for template images
      const { error: folderError } = await supabaseAdmin
        .storage
        .from('template_attachments')
        .upload('template-images/.gitkeep', new Blob(['']));
        
      if (folderError && !folderError.message.includes('already exists')) {
        console.error('Error creating template-images folder:', folderError);
      }
    }
    
    return new Response(
      JSON.stringify({
        message: 'Storage buckets verified',
        buckets: buckets?.map(b => b.name) || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, 
      }
    );
  }
});
