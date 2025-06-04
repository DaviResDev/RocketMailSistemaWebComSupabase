
interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: string;
}

interface BatchSummary {
  total: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  isFullSuccess: boolean;
  hasErrors: boolean;
  errorTypes?: Record<string, number>;
}

interface BatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  showProgress?: boolean;
  enableLargeVolumeOptimizations?: boolean;
  onBatchComplete?: (batchNumber: number, totalBatches: number, successCount: number, errorCount: number) => void;
}

export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    batchSize = 10,
    delayBetweenBatches = 100,
    showProgress = false,
    enableLargeVolumeOptimizations = false,
    onBatchComplete
  } = options;

  if (!items || items.length === 0) {
    return [];
  }

  const results: BatchResult<R>[] = [];
  const effectiveBatchSize = enableLargeVolumeOptimizations && items.length >= 500 
    ? Math.min(batchSize * 2, 50) 
    : batchSize;
  
  const effectiveDelay = enableLargeVolumeOptimizations && items.length >= 500
    ? Math.max(delayBetweenBatches / 2, 25)
    : delayBetweenBatches;

  console.log(`🚀 Processando ${items.length} itens em lotes de ${effectiveBatchSize}`);
  
  const totalBatches = Math.ceil(items.length / effectiveBatchSize);
  
  for (let i = 0; i < items.length; i += effectiveBatchSize) {
    const batch = items.slice(i, i + effectiveBatchSize);
    const batchNumber = Math.floor(i / effectiveBatchSize) + 1;
    
    if (showProgress) {
      console.log(`📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} itens)`);
    }
    
    // Process batch items in parallel
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        const result = await processor(item, globalIndex);
        return { success: true, result };
      } catch (error: any) {
        console.error(`❌ Erro no item ${globalIndex + 1}:`, error);
        return { success: false, error: error.message || 'Erro desconhecido' };
      }
    });

    // Wait for all items in this batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process batch results
    const batchSuccessCount = batchResults.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    const batchErrorCount = batch.length - batchSuccessCount;
    
    // Add results to main array
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ success: false, error: result.reason });
      }
    });

    // Call batch complete callback if provided
    if (onBatchComplete) {
      onBatchComplete(batchNumber, totalBatches, batchSuccessCount, batchErrorCount);
    }

    // Delay between batches (except for the last batch)
    if (i + effectiveBatchSize < items.length) {
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
  
  // Analyze error types
  const errorTypes: Record<string, number> = {};
  results.forEach(result => {
    if (!result.success && result.error) {
      // Extract error type from error message
      const errorType = result.error.split(':')[0] || 'Erro desconhecido';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    }
  });

  return {
    total,
    successCount,
    errorCount,
    successRate,
    isFullSuccess: successCount === total,
    hasErrors: errorCount > 0,
    errorTypes: Object.keys(errorTypes).length > 0 ? errorTypes : undefined
  };
}

export function logBatchSummary<T>(summary: BatchSummary, operation: string = 'operação') {
  console.log(`📊 Resumo da ${operation}:`);
  console.log(`   Total: ${summary.total}`);
  console.log(`   Sucessos: ${summary.successCount}`);
  console.log(`   Falhas: ${summary.errorCount}`);
  console.log(`   Taxa de sucesso: ${summary.successRate}%`);
  
  if (summary.errorTypes && Object.keys(summary.errorTypes).length > 0) {
    console.log(`   Tipos de erro:`);
    Object.entries(summary.errorTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
  }
}
