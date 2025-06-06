
interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  retryCount?: number;
  duration?: number;
}

interface BatchSummary {
  total: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  isFullSuccess: boolean;
  hasErrors: boolean;
  errorTypes?: Record<string, number>;
  avgDuration?: number;
  throughput?: number;
}

interface BatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  showProgress?: boolean;
  enableLargeVolumeOptimizations?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
  onBatchComplete?: (batchNumber: number, totalBatches: number, successCount: number, errorCount: number) => void;
  onProgress?: (current: number, total: number) => void;
}

export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    batchSize = 25, // Reduzido de 10 para 25 (ainda conservador)
    delayBetweenBatches = 1000, // Aumentado para 1s
    showProgress = false,
    enableLargeVolumeOptimizations = false,
    maxRetries = 3, // Adicionado sistema de retry
    timeoutMs = 30000, // 30s timeout por item
    backoffMultiplier = 1.5,
    onBatchComplete,
    onProgress
  } = options;

  if (!items || items.length === 0) {
    return [];
  }

  const results: BatchResult<R>[] = [];
  
  // Otimizações para grandes volumes com limites mais conservadores
  const effectiveBatchSize = enableLargeVolumeOptimizations && items.length >= 500 
    ? Math.min(batchSize * 1.5, 40) // Reduzido de 50 para 40
    : batchSize;
  
  const effectiveDelay = enableLargeVolumeOptimizations && items.length >= 500
    ? Math.max(delayBetweenBatches * 0.75, 750) // Mínimo de 750ms
    : delayBetweenBatches;

  console.log(`🚀 Processamento OTIMIZADO: ${items.length} itens em lotes de ${effectiveBatchSize} (delay: ${effectiveDelay}ms)`);
  
  const totalBatches = Math.ceil(items.length / effectiveBatchSize);
  
  for (let i = 0; i < items.length; i += effectiveBatchSize) {
    const batch = items.slice(i, i + effectiveBatchSize);
    const batchNumber = Math.floor(i / effectiveBatchSize) + 1;
    
    if (showProgress) {
      console.log(`📦 Lote OTIMIZADO ${batchNumber}/${totalBatches} (${batch.length} itens)`);
    }
    
    // Processa itens do lote com retry otimizado
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      let lastError: any;
      
      // Sistema de retry com backoff exponencial
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const startTime = Date.now();
          
          // Timeout por item
          const processPromise = processor(item, globalIndex);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout na operação')), timeoutMs);
          });
          
          const result = await Promise.race([processPromise, timeoutPromise]);
          const duration = Date.now() - startTime;
          
          // Atualiza progresso
          if (onProgress) {
            onProgress(globalIndex + 1, items.length);
          }
          
          return { 
            success: true, 
            result, 
            retryCount: attempt,
            duration 
          };
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Erro no item ${globalIndex + 1} (tentativa ${attempt + 1}/${maxRetries + 1}):`, error);
          
          // Backoff exponencial entre retries
          if (attempt < maxRetries) {
            const backoffDelay = Math.min(1000 * Math.pow(backoffMultiplier, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }
      
      // Falha após todos os retries
      return { 
        success: false, 
        error: lastError.message || 'Erro desconhecido',
        retryCount: maxRetries + 1,
        duration: 0
      };
    });

    // Aguarda conclusão do lote com tratamento de erros
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Processa resultados do lote
    const batchSuccessCount = batchResults.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    const batchErrorCount = batch.length - batchSuccessCount;
    
    // Adiciona resultados ao array principal
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ 
          success: false, 
          error: result.reason?.message || 'Erro interno do sistema',
          retryCount: 0,
          duration: 0
        });
      }
    });

    // Callback de lote completo
    if (onBatchComplete) {
      onBatchComplete(batchNumber, totalBatches, batchSuccessCount, batchErrorCount);
    }

    // Log de progresso do lote
    if (showProgress) {
      const successRate = ((batchSuccessCount / batch.length) * 100).toFixed(1);
      console.log(`✅ Lote ${batchNumber} completo: ${batchSuccessCount}/${batch.length} sucessos (${successRate}%)`);
    }

    // Delay otimizado entre lotes (exceto no último)
    if (i + effectiveBatchSize < items.length) {
      console.log(`⏳ Aguardando ${effectiveDelay}ms antes do próximo lote...`);
      await new Promise(resolve => setTimeout(resolve, effectiveDelay));
    }
  }

  return results;
}

export function getBatchSummary<T>(results: BatchResult<T>[]): BatchSummary {
  const total = results.length;
  const successCount = results.filter(r => r.success).length;
  const errorCount = total - successCount;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  
  // Calcula duração média e throughput
  const durations = results.filter(r => r.duration && r.duration > 0).map(r => r.duration!);
  const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const throughput = totalDuration > 0 ? (successCount / totalDuration) * 1000 : 0; // items/segundo
  
  // Analisa tipos de erro com categorização
  const errorTypes: Record<string, number> = {};
  results.forEach(result => {
    if (!result.success && result.error) {
      // Categoriza erros
      let errorCategory = 'Erro desconhecido';
      const error = result.error.toLowerCase();
      
      if (error.includes('timeout') || error.includes('tempo')) {
        errorCategory = 'Timeout';
      } else if (error.includes('connection') || error.includes('conexão')) {
        errorCategory = 'Erro de conexão';
      } else if (error.includes('smtp') || error.includes('email')) {
        errorCategory = 'Erro SMTP';
      } else if (error.includes('auth') || error.includes('autenticação')) {
        errorCategory = 'Erro de autenticação';
      } else if (error.includes('rate') || error.includes('limit')) {
        errorCategory = 'Limite de taxa';
      } else {
        errorCategory = result.error.split(':')[0] || 'Erro desconhecido';
      }
      
      errorTypes[errorCategory] = (errorTypes[errorCategory] || 0) + 1;
    }
  });

  return {
    total,
    successCount,
    errorCount,
    successRate,
    isFullSuccess: successCount === total,
    hasErrors: errorCount > 0,
    avgDuration: Math.round(avgDuration),
    throughput: Math.round(throughput * 100) / 100,
    errorTypes: Object.keys(errorTypes).length > 0 ? errorTypes : undefined
  };
}

export function logBatchSummary<T>(summary: BatchSummary, operation: string = 'operação') {
  console.log(`📊 Resumo OTIMIZADO da ${operation}:`);
  console.log(`   Total: ${summary.total}`);
  console.log(`   Sucessos: ${summary.successCount}`);
  console.log(`   Falhas: ${summary.errorCount}`);
  console.log(`   Taxa de sucesso: ${summary.successRate}%`);
  
  if (summary.avgDuration) {
    console.log(`   Duração média: ${summary.avgDuration}ms`);
  }
  
  if (summary.throughput) {
    console.log(`   Throughput: ${summary.throughput} items/segundo`);
  }
  
  if (summary.errorTypes && Object.keys(summary.errorTypes).length > 0) {
    console.log(`   Categorias de erro:`);
    Object.entries(summary.errorTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
  }
}

// Nova função para validação de email
export function validateEmailBatch(emails: string[]): { valid: string[], invalid: string[] } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    if (emailRegex.test(email.trim())) {
      valid.push(email.trim());
    } else {
      invalid.push(email);
    }
  });
  
  return { valid, invalid };
}

// Nova função para rate limiting inteligente
export class RateLimiter {
  private lastCall: number = 0;
  private callCount: number = 0;
  private windowStart: number = Date.now();
  
  constructor(
    private maxCalls: number = 50, // máximo de chamadas
    private windowMs: number = 60000 // janela de 1 minuto
  ) {}
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Reset da janela se passou o tempo
    if (now - this.windowStart >= this.windowMs) {
      this.callCount = 0;
      this.windowStart = now;
    }
    
    // Se atingiu o limite, aguarda
    if (this.callCount >= this.maxCalls) {
      const waitTime = this.windowMs - (now - this.windowStart);
      if (waitTime > 0) {
        console.log(`⏳ Rate limit atingido. Aguardando ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.callCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    this.callCount++;
    this.lastCall = now;
  }
}
