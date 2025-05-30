
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
  onBatchComplete?: (batchNumber: number, totalBatches: number, successCount: number, errorCount: number) => void;
}

/**
 * Process items in parallel batches with optimization for large datasets
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessingOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    batchSize = 5,
    delayBetweenBatches = 100,
    showProgress = true,
    onBatchComplete
  } = options;

  const results: BatchResult<R>[] = [];
  const totalItems = items.length;
  const totalBatches = Math.ceil(totalItems / batchSize);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    if (showProgress) {
      // Only show batch progress for smaller batches or every 10th batch for large ones
      if (totalBatches <= 20 || batchNumber % 10 === 0 || batchNumber === totalBatches) {
        toast.info(`Processando lote ${batchNumber} de ${totalBatches} (${batch.length} itens)...`);
      }
    }
    
    // Process batch items in parallel with error isolation
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
    
    // Process batch results and count successes/errors
    let batchSuccessCount = 0;
    let batchErrorCount = 0;
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          batchSuccessCount++;
          successCount++;
        } else {
          batchErrorCount++;
          errorCount++;
        }
      } else {
        const errorResult = {
          success: false,
          error: result.reason?.message || 'Erro durante processamento',
          index: results.length
        } as BatchResult<R>;
        results.push(errorResult);
        batchErrorCount++;
        errorCount++;
      }
    });
    
    // Call batch completion callback
    if (onBatchComplete) {
      onBatchComplete(batchNumber, totalBatches, batchSuccessCount, batchErrorCount);
    }
    
    // Add delay between batches to avoid overwhelming the server
    // Reduce delay for large batches to improve performance
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      const adjustedDelay = totalBatches > 50 ? Math.max(50, delayBetweenBatches / 2) : delayBetweenBatches;
      await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }
  }
  
  // Log final statistics for large batches
  if (totalBatches > 10) {
    console.log(`Batch processing completed: ${successCount} successful, ${errorCount} failed, ${totalBatches} batches processed`);
  }
  
  return results;
}

/**
 * Get summary of batch processing results with performance metrics
 */
export function getBatchSummary<T>(results: BatchResult<T>[]) {
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const total = results.length;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;
  
  return {
    total,
    successCount,
    errorCount,
    successRate: Number(successRate.toFixed(2))
  };
}

/**
 * Utility to chunk array into smaller arrays for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
