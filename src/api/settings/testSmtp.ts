
import { supabase } from '@/integrations/supabase/client';
import { SettingsFormData } from './types';

export async function testSmtpConnection(formData: SettingsFormData): Promise<any> {
  if (!formData.email_usuario) {
    throw new Error("Preencha pelo menos o email do remetente antes de testar");
  }
  
  if (formData.use_smtp && (!formData.email_smtp || !formData.email_porta || !formData.email_senha)) {
    throw new Error("Preencha todos os campos de configuração SMTP antes de testar");
  }
  
  // Enhanced error logging and improved connection test
  console.log("Iniciando teste de conexão com configurações:", {
    servidor: formData.email_smtp,
    porta: formData.email_porta,
    usuario: formData.email_usuario ? "configurado" : "não configurado",
    seguranca: formData.smtp_seguranca || "tls",
    usando_smtp: formData.use_smtp
  });
  
  try {
    const response = await supabase.functions.invoke('test-smtp', {
      body: {
        smtp_server: formData.email_smtp,
        smtp_port: Number(formData.email_porta),
        smtp_user: formData.email_usuario,
        smtp_password: formData.email_senha,
        smtp_security: formData.smtp_seguranca,
        use_resend: !formData.use_smtp,
        smtp_name: formData.smtp_nome
      },
    });
    
    console.log("Resposta detalhada do teste:", JSON.stringify(response));
    
    if (response.error) {
      console.error("Erro ao testar conexão:", response.error);
      
      // Mensagem de erro mais amigável para erros de conexão
      if (response.error.message && response.error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
      } else {
        throw new Error(`Erro ao testar conexão: ${response.error.message}`);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error("Erro detalhado ao testar conexão:", error);
    
    // Mensagem de erro mais amigável para erros comuns
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('A conexão com o servidor SMTP demorou muito tempo. Verifique as configurações e tente novamente.');
    } else if (error.message?.includes('Authentication')) {
      throw new Error('Falha na autenticação SMTP. Verifique seu usuário e senha.');
    }
    
    throw error;
  }
}
