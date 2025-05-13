
// email-sender.js - Module for sending emails via SMTP or Resend API

/**
 * Send email via SMTP using Nodemailer
 * @param {Object} config - SMTP configuration
 * @param {string} config.host - SMTP host
 * @param {number} config.port - SMTP port
 * @param {boolean} config.secure - Whether to use SSL/TLS
 * @param {string} config.user - SMTP username
 * @param {string} config.pass - SMTP password
 * @param {string} config.from - Sender email address
 * @param {Object} payload - Email payload
 * @param {string} payload.to - Recipient email address
 * @param {Array<string>} [payload.cc] - CC recipients
 * @param {Array<string>} [payload.bcc] - BCC recipients
 * @param {string} payload.subject - Email subject
 * @param {string} payload.html - Email HTML content
 * @param {Array<Object>} [payload.attachments] - Email attachments
 * @returns {Promise<Object>} - Send result
 */
async function sendEmailViaSMTP(config, payload) {
  // Import nodemailer using dynamic import for Deno compatibility
  const nodemailer = await import('npm:nodemailer@6.9.12');
  
  // Create transporter with timeouts to prevent hanging connections
  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });
  
  // Prepare email data
  const mailOptions = {
    from: `${config.name || 'DisparoPro'} <${config.user}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  };

  // Add CC if provided
  if (payload.cc && payload.cc.length > 0) {
    mailOptions.cc = payload.cc;
  }
  
  // Add BCC if provided
  if (payload.bcc && payload.bcc.length > 0) {
    mailOptions.bcc = payload.bcc;
  }
  
  // Add attachments if provided
  if (payload.attachments && payload.attachments.length > 0) {
    mailOptions.attachments = payload.attachments;
  }

  console.log(`Sending email via SMTP: ${config.host}:${config.port}`);
  console.log(`From: ${mailOptions.from} To: ${payload.to}`);
  
  // Send mail with defined transport object
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via SMTP:", info.messageId);
    return {
      success: true,
      id: info.messageId,
      provider: "smtp_nodemailer",
      from: config.user,
      reply_to: config.user,
    };
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    throw error;
  }
}

/**
 * Send email via Resend API
 * @param {string} resendApiKey - Resend API key
 * @param {string} fromName - Sender name
 * @param {string} replyTo - Reply-to email address
 * @param {Object} payload - Email payload
 * @returns {Promise<Object>} - Send result
 */
async function sendEmailViaResend(resendApiKey, fromName, replyTo, payload) {
  // Import Resend using dynamic import for Deno compatibility
  const { Resend } = await import('npm:resend@1.1.0');
  const resend = new Resend(resendApiKey);
  
  // Create email data for Resend
  const emailData = {
    from: `${fromName || 'DisparoPro'} <onboarding@resend.dev>`,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  
  // Add reply-to if provided
  if (replyTo) {
    emailData.reply_to = replyTo;
  }
  
  // Add CC if provided
  if (payload.cc && payload.cc.length > 0) {
    emailData.cc = payload.cc;
  }
  
  // Add BCC if provided
  if (payload.bcc && payload.bcc.length > 0) {
    emailData.bcc = payload.bcc;
  }
  
  // Add attachments if provided
  if (payload.attachments && payload.attachments.length > 0) {
    emailData.attachments = payload.attachments.map(attachment => ({
      filename: attachment.filename || attachment.name,
      content: attachment.content,
    }));
  }
  
  console.log(`Sending email via Resend`);
  console.log(`From: ${emailData.from} To: ${payload.to}`);
  
  try {
    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      throw new Error(result.error.message || "Unknown Resend error");
    }
    
    console.log("Email sent successfully via Resend:", result.id);
    return {
      success: true,
      id: result.id,
      provider: "resend",
      from: emailData.from,
      reply_to: emailData.reply_to,
    };
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    throw error;
  }
}

/**
 * Send email with SMTP or Resend fallback
 * @param {Object} payload - Email payload
 * @param {boolean} useSmtp - Whether to use SMTP
 * @param {Object} smtpConfig - SMTP configuration
 * @param {string} resendApiKey - Resend API key
 * @param {string} fromName - Sender name
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail(payload, useSmtp, smtpConfig, resendApiKey, fromName) {
  // First try with SMTP if configured and requested
  if (useSmtp && smtpConfig && smtpConfig.host && smtpConfig.port && 
      smtpConfig.user && smtpConfig.pass) {
    try {
      return await sendEmailViaSMTP(smtpConfig, payload);
    } catch (smtpError) {
      console.error("SMTP send failed, trying Resend fallback:", smtpError.message);
      
      // If Resend API key is not provided, rethrow the error
      if (!resendApiKey) {
        throw new Error(`SMTP error: ${smtpError.message}`);
      }
      
      // Try fallback with Resend
      try {
        const result = await sendEmailViaResend(resendApiKey, fromName, smtpConfig.user, payload);
        return {
          ...result,
          provider: "resend_fallback",
          error_original: smtpError.message
        };
      } catch (resendError) {
        throw new Error(`SMTP error: ${smtpError.message}. Resend fallback error: ${resendError.message}`);
      }
    }
  }
  
  // Use Resend if SMTP is not configured or not requested
  if (!resendApiKey) {
    throw new Error("No email sending method available. Configure SMTP or provide Resend API key.");
  }
  
  return await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
}

// Export functions as ES modules
export { sendEmail, sendEmailViaSMTP, sendEmailViaResend };
