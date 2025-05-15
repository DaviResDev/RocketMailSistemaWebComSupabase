
// email-sender.js - Module for sending emails via SMTP or Resend API

/**
 * Send email via SMTP using Nodemailer
 * @param {Object} config - SMTP configuration
 * @param {string} config.host - SMTP host
 * @param {number} config.port - SMTP port
 * @param {boolean} config.secure - Whether to use SSL/TLS
 * @param {string} config.user - SMTP username
 * @param {string} config.pass - SMTP password
 * @param {string} config.name - Sender name (optional)
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
  
  console.log("SMTP Configuration:", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: "***" },
    name: config.name || ''
  });
  
  // Create transporter with timeouts to prevent hanging connections
  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000, // 15 seconds
    socketTimeout: 30000, // 30 seconds
    logger: true, // Enable logging for better debugging
    debug: true, // Include SMTP traffic in the logs
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates for better compatibility
    },
  });
  
  // Extract domain from email for proper DKIM setup
  const emailDomain = config.user.split('@')[1];
  
  // Properly format the from field to ensure correct domain display
  const fromName = config.name || config.user.split('@')[0];
  const fromEmail = config.user; // Always use the configured email
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  
  // Prepare email data
  const mailOptions = {
    from: from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    headers: {
      // Set custom headers that might help with deliverability
      'X-Mailer': 'RocketMail',
      'X-Priority': '3',
      'Content-Type': 'text/html; charset=utf-8',
    }
  };

  // Add CC if provided
  if (payload.cc && payload.cc.length > 0) {
    mailOptions.cc = payload.cc;
  }
  
  // Add BCC if provided
  if (payload.bcc && payload.bcc.length > 0) {
    mailOptions.bcc = payload.bcc;
  }
  
  // Improved attachment handling
  if (payload.attachments && payload.attachments.length > 0) {
    // Make sure we're working with the proper format for nodemailer
    mailOptions.attachments = payload.attachments.map(attachment => {
      // If it's already in the right format (has content buffer), return as is
      if (attachment.content instanceof Uint8Array) {
        return {
          filename: attachment.filename || attachment.name || 'attachment.file',
          content: attachment.content
        };
      }
      
      // If it has base64 content
      if (attachment.content && typeof attachment.content === 'string') {
        return {
          filename: attachment.filename || attachment.name || 'attachment.file',
          content: attachment.content,
          encoding: 'base64'
        };
      }
      
      // Default case (shouldn't happen with our preprocessing)
      return attachment;
    });
    
    console.log(`Adding ${mailOptions.attachments.length} attachments to email`);
  }

  console.log(`Sending email via SMTP: ${config.host}:${config.port}`);
  console.log(`From: ${mailOptions.from} To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`HTML content length: ${payload.html?.length || 0} characters`);
  
  // Verify SMTP configuration before sending
  try {
    const verifyResult = await transporter.verify();
    console.log("SMTP verification result:", verifyResult);
  } catch (verifyError) {
    console.error("SMTP verification failed:", verifyError);
    throw new Error(`SMTP verification failed: ${verifyError.message}`);
  }
  
  // Send mail with defined transport object
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via SMTP:", info.messageId);
    console.log("SMTP Response:", info.response);
    return {
      success: true,
      id: info.messageId,
      provider: "smtp",
      from: from,
      reply_to: fromEmail,
      response: info.response
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
  
  if (!resendApiKey) {
    throw new Error("Missing Resend API key. Please configure it in your Supabase secrets.");
  }
  
  // Create email data for Resend
  const emailData = {
    from: `${fromName || 'RocketMail'} <onboarding@resend.dev>`,
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
  
  // Add attachments if provided - improved handling
  if (payload.attachments && payload.attachments.length > 0) {
    emailData.attachments = payload.attachments.map(attachment => {
      // Return an object in the format Resend expects
      return {
        filename: attachment.filename || attachment.name || 'attachment.file',
        content: attachment.content instanceof Uint8Array 
          ? Buffer.from(attachment.content).toString('base64')
          : typeof attachment.content === 'string'
            ? (attachment.content.includes('base64,') 
                ? attachment.content.split('base64,')[1] 
                : attachment.content)
            : attachment.content,
      };
    });
    
    console.log(`Adding ${emailData.attachments.length} attachments to email (Resend)`);
  }
  
  console.log(`Sending email via Resend`);
  console.log(`From: ${emailData.from} To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`HTML content length: ${payload.html?.length || 0} characters`);
  
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
 * Send email with SMTP or Resend with robust error handling
 * @param {Object} payload - Email payload
 * @param {boolean} useSmtp - Whether to use SMTP
 * @param {Object} smtpConfig - SMTP configuration
 * @param {string} resendApiKey - Resend API key
 * @param {string} fromName - Sender name
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail(payload, useSmtp, smtpConfig, resendApiKey, fromName) {
  // Always try with SMTP if configured and useSmtp is true
  if (useSmtp && smtpConfig && smtpConfig.host && smtpConfig.port && 
      smtpConfig.user && smtpConfig.pass) {
    try {
      console.log("Attempting to send via SMTP first");
      return await sendEmailViaSMTP(smtpConfig, payload);
    } catch (smtpError) {
      console.error("SMTP send failed:", smtpError.message);
      
      // If SMTP fails, try Resend if available
      if (resendApiKey) {
        console.log("SMTP failed. Trying Resend as fallback...");
        try {
          const result = await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
          result.note = "Fallback from SMTP failure";
          return result;
        } catch (resendError) {
          console.error("Resend fallback also failed:", resendError.message);
          throw new Error(`SMTP error: ${smtpError.message}. Resend fallback also failed: ${resendError.message}`);
        }
      } else {
        throw new Error(`SMTP error with ${smtpConfig.host}: ${smtpError.message}. Check your SMTP credentials and settings.`);
      }
    }
  }
  
  // If SMTP is not configured, use Resend
  if (!resendApiKey) {
    throw new Error("No email sending method available. Configure SMTP or provide Resend API key.");
  }
  
  console.log("SMTP not configured or disabled. Using Resend directly.");
  return await sendEmailViaResend(resendApiKey, fromName, smtpConfig?.user, payload);
}

// Export functions as ES modules
export { sendEmail, sendEmailViaSMTP, sendEmailViaResend };
