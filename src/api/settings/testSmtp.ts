
import { SettingsFormData } from './types';

export async function testSmtpConnection(formData: SettingsFormData): Promise<any> {
  // Email sending functionality has been removed
  console.log("Email sending functionality has been disabled");
  
  throw new Error("Funcionalidade de envio de email foi removida do sistema. Use apenas para gerenciamento de templates e contatos.");
}
