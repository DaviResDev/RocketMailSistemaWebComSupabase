
import { supabase } from '@/integrations/supabase/client';
import { SettingsFormData } from './types';

export async function testSmtpConnection(formData: SettingsFormData): Promise<any> {
  if (!formData.email_usuario) {
    throw new Error("Preencha pelo menos o email do remetente antes de testar");
  }
  
  if (formData.use_smtp && (!formData.email_smtp || !formData.email_porta || !formData.email_senha)) {
    throw new Error("Preencha todos os campos de configuração SMTP antes de testar");
  }
  
  console.log("Iniciando teste de conexão com configurações:", {
    servidor: formData.email_smtp,
    porta: formData.email_porta,
    usuario: formData.email_usuario ? "configurado" : "não configurado",
    seguranca: formData.smtp_seguranca || "tls",
    usando_smtp: formData.use_smtp
  });
  
  try {
    // Build test email payload using the same logic as the actual send-email function
    const testEmailPayload = {
      to: formData.email_usuario, // Send test email to the configured sender email
      subject: "Teste de Configuração SMTP",
      content: `
        <h2>Teste de Configuração de Email</h2>
        <p>Este é um email de teste para verificar suas configurações.</p>
        <p><strong>Método de envio:</strong> ${formData.use_smtp ? 'SMTP com fallback Resend' : 'Apenas Resend'}</p>
        <p><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p>Se você recebeu este email, suas configurações estão funcionando corretamente!</p>
      `,
      smtp_settings: formData.use_smtp ? {
        host: formData.email_smtp,
        port: formData.email_porta,
        secure: formData.smtp_seguranca === 'ssl' || formData.email_porta === 465,
        password: formData.email_senha,
        from_name: formData.smtp_nome || 'RocketMail',
        from_email: formData.email_usuario
      } : null,
      use_smtp: formData.use_smtp || false
    };
    
    console.log("Enviando teste usando a mesma edge function real:", {
      use_smtp: formData.use_smtp,
      has_smtp_settings: !!testEmailPayload.smtp_settings
    });
    
    // Use the actual send-email edge function for testing
    const response = await supabase.functions.invoke('send-email', {
      body: testEmailPayload
    });
    
    console.log("Resposta do teste:", response);
    
    if (response.error) {
      console.error("Erro ao testar:", response.error);
      throw new Error(`Erro no teste: ${response.error.message || response.error}`);
    }
    
    const responseData = response.data;
    
    if (!responseData || !responseData.success) {
      console.error("Falha no teste:", responseData);
      throw new Error(responseData?.error || "Falha no teste de envio");
    }
    
    // Return detailed success information
    return {
      success: true,
      message: `Teste realizado com sucesso via ${responseData.provider?.toUpperCase() || 'desconhecido'}!`,
      provider: responseData.provider,
      method: responseData.method,
      fallback: responseData.fallback || false,
      id: responseData.id
    };
    
  } catch (error: any) {
    console.error("Erro detalhado ao testar conexão:", error);
    
    // Enhanced error messages for better user experience
    let errorMessage = error.message || 'Erro desconhecido no teste';
    
    if (errorMessage.includes('SMTP falhou') && errorMessage.includes('Resend também falhou')) {
      errorMessage = 'Falha completa: SMTP e Resend falharam. Verifique todas as configurações.';
    } else if (errorMessage.includes('SMTP ativado mas não configurado')) {
      errorMessage = 'SMTP ativado mas configurações incompletas. Verifique todos os campos SMTP.';
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Timeout na conexão SMTP. Verifique servidor, porta e conectividade.';
    } else if (errorMessage.includes('Authentication') || errorMessage.includes('autenticação')) {
      errorMessage = 'Falha na autenticação SMTP. Verifique usuário e senha.';
    } else if (errorMessage.includes('Too many requests')) {
      errorMessage = 'Muitas tentativas. Aguarde alguns segundos e tente novamente.';
    }
    
    throw new Error(errorMessage);
  }
}
