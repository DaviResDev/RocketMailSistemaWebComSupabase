/**
 * Advanced batch processor for high-performance email sending
 */

interface BatchConfig {
  maxConcurrent: number;
  chunkSize: number;
  delayBetweenChunks: number;
  connectionTimeout: number;
  maxRetries: number;
}

interface EmailJob {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  index: number;
  retryCount?: number;
}

interface BatchResult {
  success: boolean;
  index: number;
  to: string;
  error?: string;
  duration: number;
  provider: string;
}

/**
 * Process emails in highly optimized parallel batches
 */
export async function processEmailBatchOptimized(
  emailJobs: EmailJob[],
  smtpConfig: any,
  onProgress?: (current: number, total: number) => void
): Promise<{
  results: BatchResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    avgThroughput: number;
    totalDuration: number;
  };
}> {
  const config: BatchConfig = {
    maxConcurrent: 15, // Increased from 10
    chunkSize: 25, // Larger chunks
    delayBetweenChunks: 1000, // Reduced delay
    connectionTimeout: 15000,
    maxRetries: 2
  };

  const startTime = Date.now();
  const results: BatchResult[] = [];
  let processed = 0;

  console.log(`🚀 Starting optimized batch processing: ${emailJobs.length} emails`);
  console.log(`📊 Config: ${config.maxConcurrent} concurrent, chunks of ${config.chunkSize}`);

  // Process in parallel chunks
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`⚡ Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} emails)`);

    // Process chunk with high concurrency
    const chunkPromises = chunk.map(async (emailJob) => {
      const jobStartTime = Date.now();
      
      try {
        const result = await sendEmailWithRetry(emailJob, smtpConfig, config);
        const duration = Date.now() - jobStartTime;
        
        processed++;
        onProgress?.(processed, emailJobs.length);
        
        return {
          success: true,
          index: emailJob.index,
          to: emailJob.to,
          duration,
          provider: 'smtp'
        };
      } catch (error: any) {
        const duration = Date.now() - jobStartTime;
        
        processed++;
        onProgress?.(processed, emailJobs.length);
        
        return {
          success: false,
          index: emailJob.index,
          to: emailJob.to,
          error: error.message,
          duration,
          provider: 'smtp'
        };
      }
    });

    // Wait for all emails in chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Small delay between chunks to avoid overwhelming SMTP servers
    if (i + config.chunkSize < emailJobs.length) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000; // emails per second

  console.log(`✅ Batch completed: ${successful}/${emailJobs.length} successful`);
  console.log(`⚡ Average throughput: ${avgThroughput.toFixed(2)} emails/second`);

  return {
    results,
    summary: {
      total: emailJobs.length,
      successful,
      failed: emailJobs.length - successful,
      avgThroughput: Math.round(avgThroughput * 100) / 100,
      totalDuration: Math.round(totalDuration / 1000)
    }
  };
}

/**
 * Send email with retry logic and connection optimization
 */
async function sendEmailWithRetry(
  emailJob: EmailJob,
  smtpConfig: any,
  config: BatchConfig
): Promise<void> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      await sendEmailOptimized(emailJob, smtpConfig, config.connectionTimeout);
      return; // Success
    } catch (error: any) {
      lastError = error;
      
      if (attempt < config.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⚠️ Retry ${attempt + 1}/${config.maxRetries} for ${emailJob.to} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Optimized SMTP email sending with connection pooling simulation
 */
async function sendEmailOptimized(
  emailJob: EmailJob,
  smtpConfig: any,
  timeout: number
): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('SMTP timeout')), timeout);
  });

  const sendPromise = sendEmailViaSMTP(smtpConfig, emailJob);
  
  await Promise.race([sendPromise, timeoutPromise]);
}

/**
 * Core SMTP sending function (imported from main module)
 */
async function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any> {
  // This function will be imported from the main send-email module
  throw new Error('Implementation will be imported from main module');
}
