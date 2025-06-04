
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
 * OPTIMIZED: Process items in parallel batches with enhanced performance for up to 10,000 items
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessingOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    batchSize = 10, // Optimized for email sending
    delayBetweenBatches = 50, // Reduced delay for better throughput
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
  
  // OPTIMIZED: Enhanced thresholds for better large volume handling
  const isLargeVolume = totalItems >= 1000;
  const isVeryLargeVolume = totalItems >= 5000;
  const progressThrottleInterval = isVeryLargeVolume ? 50 : isLargeVolume ? 20 : 5;
  
  console.log(`🚀 Starting ${isVeryLargeVolume ? 'very-large-volume' : isLargeVolume ? 'large-volume' : 'standard'} batch processing: ${totalItems.toLocaleString()} items, ${totalBatches} batches, ${batchSize} items/batch`);
  
  // OPTIMIZED: Process items in batches with enhanced error handling
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    // OPTIMIZED: Throttled progress reporting for large volumes
    if (showProgress && !enableLargeVolumeOptimizations) {
      if (totalBatches <= 100 || batchNumber % progressThrottleInterval === 0 || batchNumber === totalBatches) {
        const percentComplete = Math.round((batchNumber / totalBatches) * 100);
        toast.info(`Processando lote ${batchNumber.toLocaleString()} de ${totalBatches.toLocaleString()} (${percentComplete}%)...`);
      }
    }
    
    // OPTIMIZED: Process batch items with enhanced timeout handling
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      try {
        // OPTIMIZED: Adjusted timeouts based on volume
        const timeoutMs = isVeryLargeVolume ? 20000 : isLargeVolume ? 25000 : 30000;
        
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
        // OPTIMIZED: Enhanced error logging for large volumes
        if (isLargeVolume && globalIndex % 500 === 0) {
          console.warn(`Error processing item ${globalIndex.toLocaleString()}:`, error.message);
        }
        
        return {
          success: false,
          error: error.message || 'Erro desconhecido',
          index: globalIndex
        } as BatchResult<R>;
      }
    });
    
    // OPTIMIZED: Enhanced batch result processing
    const batchResults = await Promise.allSettled(batchPromises);
    
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
    
    // OPTIMIZED: Enhanced progress monitoring for large volumes
    if (isLargeVolume && batchNumber % 100 === 0) {
      const elapsed = Date.now() - startTime;
      const avgTimePerBatch = elapsed / batchNumber;
      const estimatedTotalTime = avgTimePerBatch * totalBatches;
      const remainingTime = Math.round((estimatedTotalTime - elapsed) / 1000);
      const throughput = Math.round((batchNumber * batchSize / elapsed) * 1000);
      
      console.log(`📊 Large volume progress: ${batchNumber.toLocaleString()}/${totalBatches.toLocaleString()} batches (${Math.round((batchNumber/totalBatches)*100)}%) | ETA: ${remainingTime}s | Throughput: ${throughput} items/s`);
    }
    
    // OPTIMIZED: Dynamic delay adjustment based on volume and performance
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      let adjustedDelay = delayBetweenBatches;
      
      if (isVeryLargeVolume && totalBatches > 500) {
        adjustedDelay = Math.max(25, delayBetweenBatches / 6); // Very aggressive for huge volumes
      } else if (isLargeVolume && totalBatches > 200) {
        adjustedDelay = Math.max(30, delayBetweenBatches / 4); // Aggressive for large volumes
      } else if (totalBatches > 100) {
        adjustedDelay = Math.max(40, delayBetweenBatches / 2); // Moderate optimization
      }
          
      await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }
  }
  
  // OPTIMIZED: Enhanced final performance statistics
  const totalTime = Date.now() - startTime;
  const avgTimePerItem = totalTime / totalItems;
  const successRate = totalItems > 0 ? (successCount / totalItems) * 100 : 0;
  const throughput = Math.round((totalItems / totalTime) * 1000);
  
  console.log(`✅ Batch processing completed in ${Math.round(totalTime/1000)}s:`);
  console.log(`   📊 ${successCount.toLocaleString()} successful, ${errorCount.toLocaleString()} failed (${Math.round(successRate)}% success rate)`);
  console.log(`   ⚡ ${Math.round(avgTimePerItem)}ms avg/item, ${throughput} items/s throughput`);
  
  // OPTIMIZED: Enhanced final summary for large volumes
  if (isLargeVolume) {
    const efficiency = successRate >= 95 ? '🎯' : successRate >= 85 ? '⚠️' : '🔴';
    toast.success(`${efficiency} Processamento concluído: ${throughput} itens/s, ${Math.round(successRate)}% sucesso, ${totalItems.toLocaleString()} processados`);
  }
  
  return results;
}

/**
 * OPTIMIZED: Enhanced summary with performance metrics and detailed error analysis
 */
export function getBatchSummary<T>(results: BatchResult<T>[]) {
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const total = results.length;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;
  
  // OPTIMIZED: Enhanced error grouping and analysis
  const errorTypes = results
    .filter(r => !r.success && r.error)
    .reduce((acc, r) => {
      // Better error categorization
      let errorCategory = 'Unknown';
      const errorMsg = r.error?.toLowerCase() || '';
      
      if (errorMsg.includes('timeout')) errorCategory = 'Timeout';
      else if (errorMsg.includes('smtp') || errorMsg.includes('authentication')) errorCategory = 'SMTP Error';
      else if (errorMsg.includes('network') || errorMsg.includes('connection')) errorCategory = 'Network Error';
      else if (errorMsg.includes('invalid') || errorMsg.includes('email')) errorCategory = 'Invalid Email';
      else if (errorMsg.includes('quota') || errorMsg.includes('limit')) errorCategory = 'Rate Limit';
      else errorCategory = r.error?.split(':')[0] || 'Unknown';
      
      acc[errorCategory] = (acc[errorCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  return {
    total,
    successCount,
    errorCount,
    successRate: Number(successRate.toFixed(2)),
    errorTypes,
    hasErrors: errorCount > 0,
    isFullSuccess: successCount === total,
    isHighSuccess: successRate >= 95,
    needsAttention: errorCount > total * 0.1 // More than 10% errors
  };
}

/**
 * OPTIMIZED: Enhanced chunking for better memory management
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * OPTIMIZED: Enhanced time estimation with better accuracy
 */
export function estimateProcessingTime(itemCount: number, avgTimePerItem: number = 300): {
  estimatedMinutes: number;
  estimatedHours: number;
  recommended: string;
  efficiency: 'high' | 'medium' | 'low';
} {
  // OPTIMIZED: More accurate time estimates based on batch processing
  const batchOverhead = 50; // 50ms overhead per batch
  const batchSize = itemCount >= 5000 ? 15 : itemCount >= 1000 ? 10 : 5;
  const totalBatches = Math.ceil(itemCount / batchSize);
  const totalMs = (itemCount * avgTimePerItem) + (totalBatches * batchOverhead);
  
  const estimatedMinutes = Math.round(totalMs / (1000 * 60));
  const estimatedHours = Math.round(estimatedMinutes / 60 * 10) / 10;
  
  let recommended = 'standard';
  let efficiency: 'high' | 'medium' | 'low' = 'high';
  
  if (itemCount >= 5000) {
    recommended = 'ultra-optimized';
    efficiency = itemCount <= 10000 ? 'high' : 'medium';
  } else if (itemCount >= 1000) {
    recommended = 'large-volume';
    efficiency = 'high';
  }
  
  return {
    estimatedMinutes,
    estimatedHours,
    recommended,
    efficiency
  };
}

/**
 * OPTIMIZED: New utility for batch email preparation
 */
export function prepareBatchEmails(contacts: any[], templateId: string, customSubject?: string, customContent?: string) {
  if (contacts.length > 10000) {
    throw new Error('Limite máximo de 10.000 contatos por lote excedido');
  }
  
  return contacts.map(contato => ({
    to: contato.email,
    contato_id: contato.id,
    template_id: templateId,
    contato_nome: contato.nome,
    subject: customSubject,
    content: customContent
  }));
}
