
import { toast } from 'sonner';

// Configurações específicas por provedor de email
export interface EmailProviderConfig {
  maxConcurrent: number;
  minDelayMs: number;
  maxRetries: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
  burstLimit: number;
  backoffMultiplier: number;
  useConnectionPooling: boolean;
  enableTLS: boolean;
  requireAuth: boolean;
}

export const EMAIL_PROVIDER_CONFIGS: Record<string, EmailProviderConfig> = {
  'gmail.com': {
    maxConcurrent: 1, // Gmail é muito restritivo
    minDelayMs: 5000, // 5 segundos entre envios
    maxRetries: 5,
    timeoutMs: 45000,
    rateLimitPerMinute: 10, // Máximo 10 emails por minuto
    burstLimit: 3, // Máximo 3 emails em sequência rápida
    backoffMultiplier: 2.5,
    useConnectionPooling: false, // Gmail prefere conexões únicas
    enableTLS: true,
    requireAuth: true
  },
  'outlook.com': {
    maxConcurrent: 2,
    minDelayMs: 3000,
    maxRetries: 3,
    timeoutMs: 30000,
    rateLimitPerMinute: 15,
    burstLimit: 5,
    backoffMultiplier: 2.0,
    useConnectionPooling: true,
    enableTLS: true,
    requireAuth: true
  },
  'hotmail.com': {
    maxConcurrent: 2,
    minDelayMs: 3000,
    maxRetries: 3,
    timeoutMs: 30000,
    rateLimitPerMinute: 15,
    burstLimit: 5,
    backoffMultiplier: 2.0,
    useConnectionPooling: true,
    enableTLS: true,
    requireAuth: true
  },
  'default': {
    maxConcurrent: 3,
    minDelayMs: 2000,
    maxRetries: 3,
    timeoutMs: 25000,
    rateLimitPerMinute: 20,
    burstLimit: 8,
    backoffMultiplier: 1.8,
    useConnectionPooling: true,
    enableTLS: true,
    requireAuth: true
  }
};

// Rate Limiter inteligente
export class IntelligentRateLimiter {
  private providerLimiters: Map<string, ProviderRateLimiter> = new Map();
  
  getProviderLimiter(smtpHost: string): ProviderRateLimiter {
    if (!this.providerLimiters.has(smtpHost)) {
      const config = this.getProviderConfig(smtpHost);
      this.providerLimiters.set(smtpHost, new ProviderRateLimiter(config));
    }
    return this.providerLimiters.get(smtpHost)!;
  }
  
  private getProviderConfig(smtpHost: string): EmailProviderConfig {
    const domain = smtpHost.toLowerCase();
    
    if (domain.includes('gmail')) return EMAIL_PROVIDER_CONFIGS['gmail.com'];
    if (domain.includes('outlook') || domain.includes('live')) return EMAIL_PROVIDER_CONFIGS['outlook.com'];
    if (domain.includes('hotmail')) return EMAIL_PROVIDER_CONFIGS['hotmail.com'];
    
    return EMAIL_PROVIDER_CONFIGS['default'];
  }
}

class ProviderRateLimiter {
  private requestQueue: Array<{ timestamp: number; burst: boolean }> = [];
  private burstCount = 0;
  private lastBurstReset = Date.now();
  
  constructor(private config: EmailProviderConfig) {}
  
  async waitForPermission(): Promise<void> {
    const now = Date.now();
    
    // Reset burst counter a cada minuto
    if (now - this.lastBurstReset > 60000) {
      this.burstCount = 0;
      this.lastBurstReset = now;
    }
    
    // Limpa requests antigos (último minuto)
    this.requestQueue = this.requestQueue.filter(req => now - req.timestamp < 60000);
    
    // Verifica limite por minuto
    if (this.requestQueue.length >= this.config.rateLimitPerMinute) {
      const oldestRequest = Math.min(...this.requestQueue.map(r => r.timestamp));
      const waitTime = 60000 - (now - oldestRequest) + 1000; // +1s de margem
      
      console.log(`⏳ Rate limit atingido. Aguardando ${Math.ceil(waitTime / 1000)}s...`);
      toast.info(`⏳ Aguardando ${Math.ceil(waitTime / 1000)}s para respeitar limite de taxa`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForPermission(); // Recheck após aguardar
    }
    
    // Verifica burst limit
    if (this.burstCount >= this.config.burstLimit) {
      const waitTime = this.config.minDelayMs * 2; // Dobra o delay após burst
      console.log(`💥 Burst limit atingido. Aguardando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.burstCount = 0;
    }
    
    // Verifica delay mínimo entre envios
    const lastRequest = this.requestQueue[this.requestQueue.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest.timestamp;
      if (timeSinceLastRequest < this.config.minDelayMs) {
        const waitTime = this.config.minDelayMs - timeSinceLastRequest;
        console.log(`⏱️ Aguardando delay mínimo: ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Registra a requisição
    const isBurst = this.burstCount > 0;
    this.requestQueue.push({ timestamp: Date.now(), burst: isBurst });
    this.burstCount++;
  }
  
  getConfig(): EmailProviderConfig {
    return { ...this.config };
  }
}

// Sistema de fila inteligente
export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  content: string;
  attachments?: any[];
  contato_id: string;
  template_id?: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  lastAttempt?: number;
  smtpSettings: any;
  metadata?: any;
}

export class IntelligentEmailQueue {
  private queue: QueuedEmail[] = [];
  private processing = false;
  private rateLimiter = new IntelligentRateLimiter();
  
  async addEmail(email: Omit<QueuedEmail, 'id' | 'retryCount' | 'priority'>): Promise<string> {
    const queuedEmail: QueuedEmail = {
      ...email,
      id: crypto.randomUUID(),
      retryCount: 0,
      priority: 'normal'
    };
    
    this.queue.push(queuedEmail);
    this.sortQueue();
    
    if (!this.processing) {
      this.processQueue();
    }
    
    return queuedEmail.id;
  }
  
  private sortQueue(): void {
    // Ordena por prioridade e tentativas (menos tentativas primeiro)
    this.queue.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.retryCount - b.retryCount;
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log(`📨 Iniciando processamento da fila com ${this.queue.length} emails`);
    
    while (this.queue.length > 0) {
      const email = this.queue.shift()!;
      
      try {
        await this.processSingleEmail(email);
      } catch (error: any) {
        console.error(`❌ Erro ao processar email ${email.id}:`, error);
        await this.handleEmailFailure(email, error);
      }
    }
    
    this.processing = false;
    console.log('✅ Processamento da fila concluído');
  }
  
  private async processSingleEmail(email: QueuedEmail): Promise<void> {
    const smtpHost = email.smtpSettings.host;
    const rateLimiter = this.rateLimiter.getProviderLimiter(smtpHost);
    const config = rateLimiter.getConfig();
    
    // Aguarda permissão do rate limiter
    await rateLimiter.waitForPermission();
    
    console.log(`📧 Enviando email para ${email.to} (tentativa ${email.retryCount + 1})`);
    
    // Aqui seria feita a chamada real para o edge function
    // Por ora, vamos simular com a função existente
    const result = await this.sendEmailWithRetry(email, config);
    
    if (!result.success) {
      throw new Error(result.error || 'Falha no envio');
    }
    
    console.log(`✅ Email enviado com sucesso para ${email.to}`);
  }
  
  private async sendEmailWithRetry(email: QueuedEmail, config: EmailProviderConfig): Promise<{ success: boolean; error?: string }> {
    // Esta função seria substituída pela chamada real ao edge function
    // com as otimizações implementadas
    
    // Simulação de envio com base nas configurações otimizadas
    const random = Math.random();
    
    // Gmail tem maior probabilidade de falha se não seguir as regras
    const isGmail = email.smtpSettings.host.includes('gmail');
    const successRate = isGmail ? 0.95 : 0.98; // 95% para Gmail, 98% para outros
    
    if (random < successRate) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: isGmail ? '421-4.3.0 Temporary System Problem' : 'Temporary failure'
      };
    }
  }
  
  private async handleEmailFailure(email: QueuedEmail, error: any): Promise<void> {
    const config = this.rateLimiter.getProviderLimiter(email.smtpSettings.host).getConfig();
    
    email.retryCount++;
    email.lastAttempt = Date.now();
    
    if (email.retryCount <= config.maxRetries) {
      // Calcula delay exponencial
      const delay = config.minDelayMs * Math.pow(config.backoffMultiplier, email.retryCount - 1);
      
      console.log(`🔄 Reagendando email ${email.id} para nova tentativa em ${Math.ceil(delay / 1000)}s`);
      
      setTimeout(() => {
        this.queue.unshift(email); // Adiciona no início com prioridade
        this.sortQueue();
      }, delay);
    } else {
      console.error(`💀 Email ${email.id} falhou definitivamente após ${email.retryCount} tentativas`);
      toast.error(`Email para ${email.to} falhou após ${email.retryCount} tentativas`);
    }
  }
  
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing
    };
  }
}

// Validador de configurações SMTP
export class SmtpConfigValidator {
  static validateConfig(config: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!config.host) issues.push('Host SMTP não configurado');
    if (!config.port) issues.push('Porta SMTP não configurada');
    if (!config.from_email) issues.push('Email remetente não configurado');
    if (!config.password) issues.push('Senha SMTP não configurada');
    
    // Validações específicas para Gmail
    if (config.host?.includes('gmail')) {
      if (config.port !== 587 && config.port !== 465) {
        issues.push('Gmail requer porta 587 (TLS) ou 465 (SSL)');
      }
      
      if (config.port === 587 && !config.secure) {
        // OK, TLS será ativado via STARTTLS
      } else if (config.port === 465 && config.secure !== true) {
        issues.push('Porta 465 do Gmail requer SSL ativado');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  static getOptimalSettings(host: string): Partial<any> {
    const domain = host.toLowerCase();
    
    if (domain.includes('gmail')) {
      return {
        port: 587,
        secure: false, // STARTTLS será usado
        requireTLS: true,
        connectionTimeout: 45000,
        greetingTimeout: 30000,
        socketTimeout: 45000,
        maxConnections: 1,
        pool: false // Gmail não gosta de connection pooling
      };
    }
    
    if (domain.includes('outlook') || domain.includes('live') || domain.includes('hotmail')) {
      return {
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 30000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        maxConnections: 2,
        pool: true
      };
    }
    
    // Configurações padrão para outros provedores
    return {
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 25000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
      maxConnections: 3,
      pool: true
    };
  }
}

// Monitor de performance
export class EmailPerformanceMonitor {
  private metrics: {
    totalSent: number;
    totalFailed: number;
    avgResponseTime: number;
    successRate: number;
    providerStats: Map<string, { sent: number; failed: number; avgTime: number }>;
  } = {
    totalSent: 0,
    totalFailed: 0,
    avgResponseTime: 0,
    successRate: 0,
    providerStats: new Map()
  };
  
  recordSuccess(provider: string, responseTime: number): void {
    this.metrics.totalSent++;
    this.updateProviderStats(provider, true, responseTime);
    this.updateAverages();
  }
  
  recordFailure(provider: string, responseTime: number = 0): void {
    this.metrics.totalFailed++;
    this.updateProviderStats(provider, false, responseTime);
    this.updateAverages();
  }
  
  private updateProviderStats(provider: string, success: boolean, responseTime: number): void {
    if (!this.metrics.providerStats.has(provider)) {
      this.metrics.providerStats.set(provider, { sent: 0, failed: 0, avgTime: 0 });
    }
    
    const stats = this.metrics.providerStats.get(provider)!;
    
    if (success) {
      stats.sent++;
    } else {
      stats.failed++;
    }
    
    // Atualiza média de tempo de resposta
    const total = stats.sent + stats.failed;
    stats.avgTime = ((stats.avgTime * (total - 1)) + responseTime) / total;
  }
  
  private updateAverages(): void {
    const total = this.metrics.totalSent + this.metrics.totalFailed;
    this.metrics.successRate = total > 0 ? (this.metrics.totalSent / total) * 100 : 0;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.successRate < 95) {
      recommendations.push('Taxa de sucesso baixa. Considere aumentar delays entre envios.');
    }
    
    if (this.metrics.avgResponseTime > 30000) {
      recommendations.push('Tempo de resposta alto. Verifique configurações de timeout.');
    }
    
    // Análise por provedor
    this.metrics.providerStats.forEach((stats, provider) => {
      const providerSuccessRate = (stats.sent / (stats.sent + stats.failed)) * 100;
      
      if (providerSuccessRate < 90 && provider.includes('gmail')) {
        recommendations.push(`Gmail com baixa taxa de sucesso (${providerSuccessRate.toFixed(1)}%). Considere aumentar delays.`);
      }
    });
    
    return recommendations;
  }
}

// Instância global do monitor
export const emailMonitor = new EmailPerformanceMonitor();

// Função auxiliar para otimizar configurações SMTP
export function optimizeSmtpSettings(originalSettings: any): any {
  const validator = new SmtpConfigValidator();
  const optimal = SmtpConfigValidator.getOptimalSettings(originalSettings.host);
  
  return {
    ...originalSettings,
    ...optimal,
    // Mantém configurações críticas do usuário
    host: originalSettings.host,
    from_email: originalSettings.from_email,
    password: originalSettings.password,
    from_name: originalSettings.from_name
  };
}
