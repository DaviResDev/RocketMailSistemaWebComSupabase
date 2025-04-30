
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  isTest?: boolean;
  template_id?: string;
  contato_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get email settings from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = Number(Deno.env.get("SMTP_PORT"));
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASS");
    const sender_email = Deno.env.get("SENDER_EMAIL") || smtp_user;

    // Validate SMTP configuration
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
      console.error("SMTP configuration incomplete");
      return new Response(
        JSON.stringify({
          error: "SMTP configuration incomplete. Please check your email settings.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse request body
    const { to, subject, content, isTest, template_id, contato_id }: EmailRequest = await req.json();

    // Validate request data
    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required email parameters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Attempting to send email to ${to}`);

    // Create SMTP client
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: smtp_host,
      port: smtp_port,
      username: smtp_user,
      password: smtp_pass,
    });

    // Send email
    const sendResult = await client.send({
      from: sender_email,
      to: to,
      subject: subject,
      content: content,
      html: content,
    });

    await client.close();

    console.log("Email sent successfully:", sendResult);

    // If this is not a test email, update the envios table
    if (!isTest && template_id && contato_id) {
      // Get supabase client from Authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Missing Authorization header");
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      // Update the envio status
      const response = await fetch(`${supabaseUrl}/rest/v1/envios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          contato_id: contato_id,
          template_id: template_id,
          status: "entregue",
          data_envio: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error updating envio status:", errorText);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred while sending the email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
