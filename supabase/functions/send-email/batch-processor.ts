
/**
 * Processador de lote otimizado para Gmail com rate limiting inteligente
 */

interface OptimizedBatchConfig {
  maxConcurrent: number;
  chunkSize: number;
  delayBetweenChunks: number;
  connectionTimeout: number;
  maxRetries: number;
  rateLimit: {
    emailsPerSecond: number;
    burstLimit: number;
  };
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
 * Processa emails com otimizações específicas para Gmail
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
  // Configuração otimizada para Gmail
  const config: OptimizedBatchConfig = {
    maxConcurrent: 25, // Reduzido para evitar rate limits do Gmail
    chunkSize: 200, // Chunks maiores para melhor eficiência
    delayBetweenChunks: 2000, // 2s entre chunks para respeitar rate limits
    connectionTimeout: 30000, // 30s timeout para conexões estáveis
    maxRetries: 3, // Mais tentativas para recuperação
    rateLimit: {
      emailsPerSecond: 14, // Gmail permite ~15 emails/segundo
      burstLimit: 100 // Limite de rajada
    }
  };

  const startTime = Date.now();
  const results: BatchResult[] = [];
  let processed = 0;
  let rateLimitTracker = {
    emailsSent: 0,
    lastReset: Date.now(),
    burstCount: 0
  };

  console.log(`🚀 Iniciando processamento otimizado para Gmail: ${emailJobs.length} emails`);
  console.log(`📊 Config otimizada: ${config.maxConcurrent} concurrent, chunks de ${config.chunkSize}`);
  console.log(`⚡ Rate limit: ${config.rateLimit.emailsPerSecond} emails/s, burst: ${config.rateLimit.burstLimit}`);

  // Processamento em chunks otimizados
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`⚡ Processando chunk ${chunkNumber}/${totalChunks} (${chunk.length} emails)`);

    // Rate limiting inteligente
    await enforceRateLimit(rateLimitTracker, config.rateLimit);

    // Processa chunk com concorrência controlada
    const chunkPromises = [];
    const semaphore = new Semaphore(config.maxConcurrent);

    for (const emailJob of chunk) {
      const promise = semaphore.acquire().then(async (release) => {
        const jobStartTime = Date.now();
        
        try {
          // Rate limiting por email individual
          await rateLimitedEmailSend(emailJob, smtpConfig, config, rateLimitTracker);
          const duration = Date.now() - jobStartTime;
          
          processed++;
          onProgress?.(processed, emailJobs.length);
          
          return {
            success: true,
            index: emailJob.index,
            to: emailJob.to,
            duration,
            provider: 'smtp-optimized'
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
            provider: 'smtp-optimized'
          };
        } finally {
          release();
        }
      });
      
      chunkPromises.push(promise);
    }

    // Aguarda conclusão do chunk
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Delay otimizado entre chunks
    if (i + config.chunkSize < emailJobs.length) {
      console.log(`⏸️ Pausa de ${config.delayBetweenChunks}ms entre chunks`);
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000;

  console.log(`✅ Processamento concluído: ${successful}/${emailJobs.length} sucessos`);
  console.log(`📊 Throughput médio: ${avgThroughput.toFixed(2)} emails/segundo`);
  console.log(`⏱️ Duração total: ${Math.round(totalDuration / 1000)}s`);

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
 * Semáforo para controle de concorrência
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}

/**
 * Rate limiting inteligente para Gmail
 */
async function enforceRateLimit(
  tracker: any,
  rateLimit: { emailsPerSecond: number; burstLimit: number }
): Promise<void> {
  const now = Date.now();
  const timeSinceLastReset = now - tracker.lastReset;

  // Reset contador a cada segundo
  if (timeSinceLastReset >= 1000) {
    tracker.emailsSent = 0;
    tracker.lastReset = now;
    tracker.burstCount = 0;
  }

  // Verifica limite de burst
  if (tracker.burstCount >= rateLimit.burstLimit) {
    const waitTime = 1000 - timeSinceLastReset;
    if (waitTime > 0) {
      console.log(`🚦 Rate limit: aguardando ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Verifica limite por segundo
  if (tracker.emailsSent >= rateLimit.emailsPerSecond) {
    const waitTime = 1000 - timeSinceLastReset;
    if (waitTime > 0) {
      console.log(`⏳ Rate limit por segundo: aguardando ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Envio de email com rate limiting
 */
async function rateLimitedEmailSend(
  emailJob: EmailJob,
  smtpConfig: any,
  config: OptimizedBatchConfig,
  rateLimitTracker: any
): Promise<void> {
  // Aplica rate limiting antes do envio
  await enforceRateLimit(rateLimitTracker, config.rateLimit);
  
  // Incrementa contadores
  rateLimitTracker.emailsSent++;
  rateLimitTracker.burstCount++;

  // Envia com retry
  return await sendEmailWithRetry(emailJob, smtpConfig, config);
}

/**
 * Envio com retry otimizado
 */
async function sendEmailWithRetry(
  emailJob: EmailJob,
  smtpConfig: any,
  config: OptimizedBatchConfig
): Promise<void> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      await sendEmailOptimized(emailJob, smtpConfig, config.connectionTimeout);
      return; // Sucesso
    } catch (error: any) {
      lastError = error;
      
      console.log(`⚠️ Tentativa ${attempt + 1}/${config.maxRetries + 1} falhou para ${emailJob.to}: ${error.message}`);
      
      if (attempt < config.maxRetries) {
        // Backoff exponencial com jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.log(`🔄 Retry em ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Envio otimizado para Gmail
 */
async function sendEmailOptimized(
  emailJob: EmailJob,
  smtpConfig: any,
  timeout: number
): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout de conexão SMTP')), timeout);
  });

  const sendPromise = sendEmailViaSMTP(smtpConfig, emailJob);
  
  await Promise.race([sendPromise, timeoutPromise]);
}

/**
 * Função de envio SMTP (será importada do módulo principal)
 */
async function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any> {
  // Esta função será importada do módulo principal send-email
  throw new Error('Implementação será importada do módulo principal');
}
