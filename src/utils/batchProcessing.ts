
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
  enableLargeVolumeOptimizations?: boolean;
  onBatchComplete?: (batchNumber: number, totalBatches: number, successCount: number, errorCount: number) => void;
}

/**
 * Process items in parallel batches with advanced optimization for large datasets (2000+ items)
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
    enableLargeVolumeOptimizations = false,
    onBatchComplete
  } = options;

  const results: BatchResult<R>[] = [];
  const totalItems = items.length;
  const totalBatches = Math.ceil(totalItems / batchSize);
  
  let successCount = 0;
  let errorCount = 0;
  let startTime = Date.now();
  
  // For large volumes, enable aggressive optimizations
  const isLargeVolume = totalItems >= 500;
  const progressThrottleInterval = isLargeVolume ? 20 : 5; // Show progress every 20 batches for large volumes
  
  console.log(`🚀 Starting ${isLargeVolume ? 'large-volume' : 'standard'} batch processing: ${totalItems} items, ${totalBatches} batches, ${batchSize} items/batch`);
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    // Throttled progress reporting for large volumes
    if (showProgress && !enableLargeVolumeOptimizations) {
      if (totalBatches <= 50 || batchNumber % progressThrottleInterval === 0 || batchNumber === totalBatches) {
        toast.info(`Processando lote ${batchNumber} de ${totalBatches} (${batch.length} itens)...`);
      }
    }
    
    // Process batch items in parallel with aggressive error isolation for large volumes
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      try {
        // Add timeout for large volume processing to prevent hanging
        const timeoutMs = isLargeVolume ? 30000 : 60000; // 30s for large volumes, 60s for normal
        
        const result = await Promise.race([
          processor(item, globalIndex),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout processing item')), timeoutMs)
          )
        ]);
        
        return {
          success: true,
          result,
          index: globalIndex
        } as BatchResult<R>;
      } catch (error: any) {
        // Enhanced error logging for large volumes
        if (isLargeVolume && globalIndex % 100 === 0) {
          console.warn(`Error processing item ${globalIndex}:`, error.message);
        }
        
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          index: globalIndex
        } as BatchResult<R>;
      }
    });
    
    // Wait for all items in this batch to complete with better error handling
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
    
    // Progress and performance monitoring for large volumes
    if (isLargeVolume && batchNumber % 50 === 0) {
      const elapsed = Date.now() - startTime;
      const avgTimePerBatch = elapsed / batchNumber;
      const estimatedTotalTime = avgTimePerBatch * totalBatches;
      const remainingTime = Math.round((estimatedTotalTime - elapsed) / 1000);
      
      console.log(`Large volume progress: ${batchNumber}/${totalBatches} batches (${Math.round((batchNumber/totalBatches)*100)}%) | ETA: ${remainingTime}s`);
    }
    
    // Optimized delay between batches
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      // For very large volumes, use minimal delays to maximize throughput
      const adjustedDelay = isLargeVolume && totalBatches > 100 
        ? Math.max(25, delayBetweenBatches / 4) 
        : totalBatches > 50 
          ? Math.max(50, delayBetweenBatches / 2) 
          : delayBetweenBatches;
          
      await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }
  }
  
  // Final performance statistics
  const totalTime = Date.now() - startTime;
  const avgTimePerItem = totalTime / totalItems;
  const successRate = totalItems > 0 ? (successCount / totalItems) * 100 : 0;
  
  console.log(`✅ Batch processing completed in ${Math.round(totalTime/1000)}s:`);
  console.log(`   📊 ${successCount} successful, ${errorCount} failed (${Math.round(successRate)}% success rate)`);
  console.log(`   ⚡ ${Math.round(avgTimePerItem)}ms avg/item, ${totalBatches} batches processed`);
  
  // Show final summary for large volumes
  if (isLargeVolume) {
    const throughput = Math.round((totalItems / totalTime) * 1000);
    toast.success(`🎯 Processamento concluído: ${throughput} itens/s, ${Math.round(successRate)}% sucesso`);
  }
  
  return results;
}

/**
 * Get enhanced summary of batch processing results with performance metrics
 */
export function getBatchSummary<T>(results: BatchResult<T>[]) {
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const total = results.length;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;
  
  // Group errors by type for better debugging
  const errorTypes = results
    .filter(r => !r.success && r.error)
    .reduce((acc, r) => {
      const errorType = r.error?.split(':')[0] || 'Unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  return {
    total,
    successCount,
    errorCount,
    successRate: Number(successRate.toFixed(2)),
    errorTypes,
    hasErrors: errorCount > 0,
    isFullSuccess: successCount === total
  };
}

/**
 * Enhanced utility to chunk array into smaller arrays for optimized batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Utility to estimate processing time for large volumes
 */
export function estimateProcessingTime(itemCount: number, avgTimePerItem: number = 500): {
  estimatedMinutes: number;
  estimatedHours: number;
  recommended: string;
} {
  const totalMs = itemCount * avgTimePerItem;
  const estimatedMinutes = Math.round(totalMs / (1000 * 60));
  const estimatedHours = Math.round(estimatedMinutes / 60 * 10) / 10;
  
  let recommended = 'standard';
  if (itemCount >= 1000) recommended = 'large-volume';
  if (itemCount >= 2000) recommended = 'ultra-optimized';
  
  return {
    estimatedMinutes,
    estimatedHours,
    recommended
  };
}
