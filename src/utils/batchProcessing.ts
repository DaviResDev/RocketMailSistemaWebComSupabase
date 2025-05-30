
import { toast } from 'sonner';

export interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  index: number;
}

export interface BatchProcessingOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  showProgress?: boolean;
}

/**
 * Process items in parallel batches with optional progress feedback
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessingOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    batchSize = 5, // Process 5 items at a time by default
    delayBetweenBatches = 100, // 100ms delay between batches
    showProgress = true
  } = options;

  const results: BatchResult<R>[] = [];
  const totalItems = items.length;
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    
    if (showProgress) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalItems / batchSize);
      toast.info(`Processando lote ${batchNumber} de ${totalBatches}...`);
    }
    
    // Process batch items in parallel
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      try {
        const result = await processor(item, globalIndex);
        return {
          success: true,
          result,
          index: globalIndex
        } as BatchResult<R>;
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          index: globalIndex
        } as BatchResult<R>;
      }
    });
    
    // Wait for all items in this batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process batch results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || 'Erro durante processamento',
          index: results.length
        });
      }
    });
    
    // Add delay between batches to avoid overwhelming the server
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}

/**
 * Get summary of batch processing results
 */
export function getBatchSummary<T>(results: BatchResult<T>[]) {
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const total = results.length;
  
  return {
    total,
    successCount,
    errorCount,
    successRate: total > 0 ? (successCount / total) * 100 : 0
  };
}
