
import { SettingsFormData } from './types';

export async function testSmtpConnection(formData: SettingsFormData): Promise<any> {
  try {
    if (!formData.smtp_host || !formData.email_usuario || !formData.smtp_pass) {
      throw new Error("Configuração SMTP incompleta. Preencha host, usuário e senha");
    }
    
    console.log("Testando conexão SMTP com:", {
      host: formData.smtp_host,
      porta: formData.email_porta,
      usuario: formData.email_usuario,
      seguranca: formData.smtp_seguranca
    });
    
    // Validar configuração SSL/TLS com base na porta
    const porta = formData.email_porta || 587;
    let seguranca = formData.smtp_seguranca || 'tls';
    
    if (porta === 465 && seguranca !== 'ssl') {
      console.log("⚠️ Porta 465 detectada mas segurança não é SSL. Ajustando para SSL");
      seguranca = 'ssl';
    } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
      console.log("⚠️ Porta 587/25 detectada mas segurança não é TLS. Ajustando para TLS");
      seguranca = 'tls';
    }
    
    // Cria objeto de teste com dados corretos para validação
    const testData = {
      smtp_host: formData.smtp_host,
      email_porta: porta,
      email_usuario: formData.email_usuario,
      smtp_pass: formData.smtp_pass,
      smtp_seguranca: seguranca,
      smtp_from_name: formData.smtp_from_name || formData.smtp_nome || 'RocketMail'
    };
    
    // Enviar solicitação para testar conexão SMTP
    const response = await fetch('/api/test-smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log("✅ Conexão SMTP bem-sucedida!");
      return { 
        success: true, 
        message: result.message || "Conexão SMTP testada com sucesso!" 
      };
    } else {
      console.error("❌ Erro na conexão SMTP:", result.message);
      return { 
        success: false, 
        message: result.message || "Erro ao testar conexão SMTP" 
      };
    }
  } catch (error: any) {
    console.error('Erro ao testar conexão SMTP:', error);
    return { 
      success: false, 
      message: error.message || "Erro ao testar conexão SMTP" 
    };
  }
}
