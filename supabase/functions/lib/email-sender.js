
// email-sender.js - Email sending functionality has been removed

/**
 * Email sending functionality has been completely removed from the system
 * This file is kept for reference but all functions now return errors
 */

async function sendEmailViaSMTP(config, payload) {
  console.log("Email sending functionality has been removed");
  throw new Error("Funcionalidade de envio SMTP foi removida do sistema");
}

async function sendEmailViaResend(resendApiKey, fromName, replyTo, payload) {
  console.log("Email sending functionality has been removed");
  throw new Error("Funcionalidade de envio Resend foi removida do sistema");
}

async function sendEmail(payload, useSmtp, smtpConfig, resendApiKey, fromName) {
  console.log("Email sending functionality has been removed");
  throw new Error("Funcionalidade de envio de email foi removida do sistema");
}

// Export functions as ES modules
export { sendEmail, sendEmailViaSMTP, sendEmailViaResend };
