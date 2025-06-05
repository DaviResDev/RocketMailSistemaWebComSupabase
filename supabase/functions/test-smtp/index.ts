
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Função para validar e testar uma conexão SMTP
 */
async function validateSmtpConnection(smtpSettings: any): Promise<any> {
  if (!smtpSettings.smtp_host) {
    throw new Error("SMTP host é obrigatório");
  }

  if (!smtpSettings.email_usuario) {
    throw new Error("Email do usuário é obrigatório");
  }

  if (!smtpSettings.smtp_pass) {
    throw new Error("Senha SMTP é obrigatória");
  }
  
  const port = parseInt(smtpSettings.email_porta) || 587;
  
  // Auto-detectar SSL/TLS baseado na porta
  if (port === 465) {
    console.log("Porta 465: Configurando como SSL");
    smtpSettings.smtp_seguranca = 'ssl';
  } else if (port === 587 || port === 25) {
    console.log("Porta 587/25: Configurando como TLS");
    smtpSettings.smtp_seguranca = 'tls';
  }
  
  // Tenta estabelecer uma conexão básica apenas para verificar
  let conn;
  try {
    console.log(`Testando conexão SMTP: ${smtpSettings.smtp_host}:${port}`);
    
    if (smtpSettings.smtp_seguranca === 'ssl') {
      // Conexão SSL direta
      conn = await Deno.connectTls({
        hostname: smtpSettings.smtp_host,
        port: port,
      });
    } else {
      // Conexão simples para depois usar STARTTLS
      conn = await Deno.connect({
        hostname: smtpSettings.smtp_host,
        port: port,
      });
    }
    
    // Se a conexão foi bem-sucedida, já podemos considerar como um sucesso parcial
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) {
      throw new Error("Não foi possível ler a resposta do servidor SMTP");
    }
    
    const response = decoder.decode(buffer.subarray(0, n));
    console.log(`Resposta do servidor SMTP: ${response.trim()}`);
    
    // Verificar se a resposta começa com código 220 (serviço pronto)
    if (!response.startsWith('220')) {
      throw new Error(`Servidor SMTP respondeu com erro: ${response.trim()}`);
    }
    
    // Enviar comando EHLO para verificar capacidades
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(`EHLO ${smtpSettings.smtp_host}\r\n`));
    
    const ehloBuffer = new Uint8Array(2048); // Buffer maior para resposta EHLO
    const ehloN = await conn.read(ehloBuffer);
    if (ehloN === null) {
      throw new Error("Não foi possível ler a resposta EHLO do servidor SMTP");
    }
    
    const ehloResponse = decoder.decode(ehloBuffer.subarray(0, ehloN));
    console.log(`Resposta EHLO: ${ehloResponse.trim()}`);
    
    // Verificar se a resposta do EHLO indica sucesso (250)
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`Servidor SMTP rejeitou EHLO: ${ehloResponse.trim()}`);
    }
    
    // Enviar QUIT para encerrar sessão corretamente
    await conn.write(encoder.encode("QUIT\r\n"));
    
    // Fechar conexão
    conn.close();
    
    return {
      success: true,
      message: "Conexão com servidor SMTP estabelecida com sucesso!",
      details: {
        host: smtpSettings.smtp_host,
        port: port,
        security: smtpSettings.smtp_seguranca,
        username: smtpSettings.email_usuario
      }
    };
  } catch (error) {
    if (conn) {
      try { conn.close(); } catch (_) { /* ignore */ }
    }
    console.error("Erro na validação SMTP:", error);
    throw new Error(`Erro ao conectar ao servidor SMTP: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    console.log("Testando conexão SMTP para:", {
      host: requestBody.smtp_host,
      porta: requestBody.email_porta || 587,
      usuario: requestBody.email_usuario,
      seguranca: requestBody.smtp_seguranca
    });
    
    const result = await validateSmtpConnection(requestBody);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conexão SMTP testada com sucesso!",
        details: result.details
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Erro no teste SMTP:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "Falha ao testar conexão SMTP",
        error: error.message
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
