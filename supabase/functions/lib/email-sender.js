
// email-sender.js - REMOVIDO: Funcionalidade Resend completamente removida

/**
 * Funcionalidade Resend foi completamente removida do sistema
 * Todos os envios agora usam obrigatoriamente o SMTP configurado pelo usuário
 * Este arquivo é mantido apenas para referência histórica
 */

async function sendEmailViaSMTP(config, payload) {
  console.log("⚠️ Função depreciada: Use o processador SMTP otimizado");
  throw new Error("Use o processador SMTP otimizado em optimized-processor.ts");
}

async function sendEmailViaResend(resendApiKey, fromName, replyTo, payload) {
  console.log("🚫 Resend foi REMOVIDO: Use apenas SMTP do usuário");
  throw new Error("Resend foi removido. Use apenas SMTP configurado pelo usuário");
}

async function sendEmail(payload, useSmtp, smtpConfig, resendApiKey, fromName) {
  console.log("🚫 Função depreciada: Use processOptimizedBatch ou processSingleSend");
  throw new Error("Use processOptimizedBatch ou processSingleSend do optimized-processor.ts");
}

// Export functions as ES modules
export { sendEmail, sendEmailViaSMTP, sendEmailViaResend };
