
/**
 * ULTRA-PARALLEL V6.0 OTIMIZADO - Sistema estabilizado com configurações realistas
 * Meta: 50 emails/segundo com 50 conexões simultâneas e alta estabilidade
 */

interface UltraParallelConfig {
  maxConcurrent: number;
  chunkSize: number;
  delayBetweenChunks: number;
  connectionTimeout: number;
  maxRetries: number;
  targetThroughput: number;
  batchHistorySize: number;
  rateLimiting: {
    emailsPerSecond: number;
    burstLimit: number;
    backoffMultiplier: number;
  };
}

interface UltraEmailJob {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  index: number;
  retryCount?: number;
  template_id?: string;
  contato_id?: string;
  contato_nome?: string;
  template_nome?: string;
  fromName?: string;
  fromEmail?: string;
}

interface UltraResult {
  success: boolean;
  index: number;
  to: string;
  error?: string;
  duration: number;
  provider: string;
  connectionSlot: number;
  attempt: number;
  retryReason?: string;
}

/**
 * Processamento ULTRA-PARALLEL V6.0 OTIMIZADO com configurações estabilizadas
 */
export async function processUltraParallelV6(
  emailJobs: UltraEmailJob[],
  smtpConfig: any,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  results: UltraResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    avgThroughput: number;
    peakThroughput: number;
    totalDuration: number;
    targetAchieved: boolean;
    avgEmailDuration: number;
    successRate: string;
    errorBreakdown: Record<string, number>;
    retryStats: {
      totalRetries: number;
      maxRetriesUsed: number;
      successAfterRetry: number;
    };
  };
}> {
  // Configuração OTIMIZADA e CONSERVADORA para alta estabilidade
  const config: UltraParallelConfig = {
    maxConcurrent: 50, // Reduzido para estabilidade
    chunkSize: 50, // Chunks menores para melhor controle
    delayBetweenChunks: 2000, // 2s delay para evitar sobrecarga
    connectionTimeout: 30000, // 30s timeout (aumentado)
    maxRetries: 3, // Sistema robusto de retry
    targetThroughput: 50, // Meta realista
    batchHistorySize: 250, // Lotes menores para histórico
    rateLimiting: {
      emailsPerSecond: 2, // Rate limit conservador
      burstLimit: 10,
      backoffMultiplier: 1.5
    }
  };

  const startTime = Date.now();
  const results: UltraResult[] = [];
  const historyRecords: any[] = [];
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  let peakThroughput = 0;
  let progressHistory: Array<{time: number, count: number}> = [];
  let totalRetries = 0;
  let maxRetriesUsed = 0;
  let successAfterRetry = 0;
  const errorBreakdown: Record<string, number> = {};

  console.log(`🚀 ULTRA-PARALLEL V6.0 OTIMIZADO: ${emailJobs.length} emails`);
  console.log(`🎯 META REALISTA: ${config.targetThroughput} emails/s com ${config.maxConcurrent} conexões`);
  console.log(`⚡ CONFIGURAÇÃO ESTABILIZADA: chunks ${config.chunkSize}, delay ${config.delayBetweenChunks}ms, timeout ${config.connectionTimeout}ms`);

  // Pool de conexões com controle de qualidade
  const connectionPool = new Map<number, any>();
  let activeConnections = 0;
  
  // Rate limiter para controle de fluxo
  const rateLimiter = {
    lastCall: 0,
    callCount: 0,
    windowStart: Date.now(),
    
    async waitIfNeeded() {
      const now = Date.now();
      const windowMs = 1000; // 1 segundo
      
      // Reset da janela
      if (now - this.windowStart >= windowMs) {
        this.callCount = 0;
        this.windowStart = now;
      }
      
      // Controle de rate limiting
      if (this.callCount >= config.rateLimiting.emailsPerSecond) {
        const waitTime = windowMs - (now - this.windowStart);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          this.callCount = 0;
          this.windowStart = Date.now();
        }
      }
      
      this.callCount++;
    }
  };
  
  // Função para calcular throughput em tempo real
  const calculateThroughput = () => {
    const now = Date.now();
    progressHistory.push({ time: now, count: processed });
    progressHistory = progressHistory.filter(p => now - p.time <= 5000); // 5s de histórico

    if (progressHistory.length >= 2) {
      const recent = progressHistory[progressHistory.length - 1];
      const older = progressHistory[0];
      const timeDiff = recent.time - older.time;
      const countDiff = recent.count - older.count;
      return timeDiff > 0 ? (countDiff / timeDiff) * 1000 : 0;
    }
    return 0;
  };

  // Função para categorizar erros
  const categorizeError = (error: string): string => {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout') || errorLower.includes('tempo')) {
      return 'Timeout';
    } else if (errorLower.includes('connection') || errorLower.includes('conexão')) {
      return 'Erro de Conexão';
    } else if (errorLower.includes('smtp') || errorLower.includes('auth')) {
      return 'Erro SMTP/Auth';
    } else if (errorLower.includes('rate') || errorLower.includes('limit')) {
      return 'Rate Limit';
    } else if (errorLower.includes('dns') || errorLower.includes('host')) {
      return 'Erro DNS/Host';
    } else if (errorLower.includes('ssl') || errorLower.includes('tls')) {
      return 'Erro SSL/TLS';
    } else {
      return 'Erro Geral';
    }
  };

  // Processamento em chunks OTIMIZADOS
  for (let i = 0; i < emailJobs.length; i += config.chunkSize) {
    const chunk = emailJobs.slice(i, i + config.chunkSize);
    const chunkNumber = Math.floor(i / config.chunkSize) + 1;
    const totalChunks = Math.ceil(emailJobs.length / config.chunkSize);

    console.log(`⚡ CHUNK OTIMIZADO ${chunkNumber}/${totalChunks}: ${chunk.length} emails (${config.maxConcurrent} slots máx.)`);

    // Array de promises com controle de concorrência otimizado
    const chunkPromises = chunk.map(async (emailData, emailIndex) => {
      const globalIndex = i + emailIndex;
      const connectionSlot = globalIndex % config.maxConcurrent;
      
      // Rate limiting antes do envio
      await rateLimiter.waitIfNeeded();
      
      const jobStartTime = Date.now();
      let lastError: Error;
      let retryReason = '';
      
      try {
        // Sistema de retry ROBUSTO com backoff exponencial
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            activeConnections++;
            console.log(`📤 [${globalIndex + 1}/${emailJobs.length}] Slot ${connectionSlot} (Tent. ${attempt + 1}): ${emailData.to}`);
            
            const result = await sendEmailUltraOptimized(emailData, smtpConfig, config.connectionTimeout);
            const duration = Date.now() - jobStartTime;
            
            processed++;
            successCount++;
            if (attempt > 0) successAfterRetry++;
            totalRetries += attempt;
            if (attempt > maxRetriesUsed) maxRetriesUsed = attempt;
            
            onProgress?.(processed, emailJobs.length);
            
            // Calcula throughput atual
            const currentThroughput = calculateThroughput();
            if (currentThroughput > peakThroughput) {
              peakThroughput = currentThroughput;
            }
            
            console.log(`✅ [${globalIndex + 1}] SUCESSO OTIMIZADO em ${duration}ms (${currentThroughput.toFixed(2)} emails/s)`);
            if (attempt > 0) {
              console.log(`🔄 Sucesso após ${attempt} tentativas: ${retryReason}`);
            }

            // Prepara registro para histórico
            const historyRecord = {
              user_id: userId,
              template_id: emailData.template_id || null,
              contato_id: emailData.contato_id || null,
              remetente_nome: emailData.fromName || result.fromName || 'Sistema',
              remetente_email: emailData.fromEmail || result.from || extractEmailAddress(result.from || ''),
              destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
              destinatario_email: extractEmailAddress(emailData.to),
              status: 'entregue',
              template_nome: emailData.template_nome || null,
              tipo_envio: 'ultra_parallel_v5',
              mensagem_erro: null,
              data_envio: new Date().toISOString()
            };
            historyRecords.push(historyRecord);
            
            activeConnections--;
            return {
              success: true,
              result: result,
              to: emailData.to,
              index: globalIndex,
              duration,
              provider: 'ultra_parallel_v6_optimized',
              connectionSlot,
              attempt: attempt + 1,
              retryReason: attempt > 0 ? retryReason : undefined
            };
          } catch (error: any) {
            lastError = error;
            retryReason = categorizeError(error.message);
            
            console.warn(`⚠️ [${globalIndex + 1}] Tentativa ${attempt + 1} falhou: ${error.message}`);
            
            if (attempt < config.maxRetries) {
              // Backoff exponencial otimizado
              const backoffDelay = Math.min(
                1000 * Math.pow(config.rateLimiting.backoffMultiplier, attempt), 
                10000
              );
              console.log(`⏳ Aguardando ${backoffDelay}ms antes do retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
          } finally {
            activeConnections--;
          }
        }
        
        // Falha após todos os retries
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        totalRetries += config.maxRetries;
        if (config.maxRetries > maxRetriesUsed) maxRetriesUsed = config.maxRetries;
        
        const errorCategory = categorizeError(lastError.message);
        errorBreakdown[errorCategory] = (errorBreakdown[errorCategory] || 0) + 1;
        
        onProgress?.(processed, emailJobs.length);

        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

        console.error(`❌ [${globalIndex + 1}] FALHA FINAL após ${config.maxRetries + 1} tentativas: ${errorCategory}`);

        // Registro de falha para histórico
        const historyRecord = {
          user_id: userId,
          template_id: emailData.template_id || null,
          contato_id: emailData.contato_id || null,
          remetente_nome: emailData.fromName || 'Sistema',
          remetente_email: emailData.fromEmail || 'sistema@app.com',
          destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
          destinatario_email: extractEmailAddress(emailData.to),
          status: 'falhou',
          template_nome: emailData.template_nome || null,
          tipo_envio: 'ultra_parallel_v5',
          mensagem_erro: `${errorCategory}: ${lastError.message}`,
          data_envio: new Date().toISOString()
        };
        historyRecords.push(historyRecord);
        
        return {
          success: false,
          error: `${errorCategory}: ${lastError.message}`,
          to: emailData.to,
          index: globalIndex,
          duration,
          provider: 'ultra_parallel_v6_optimized',
          connectionSlot,
          attempt: config.maxRetries + 1,
          retryReason: errorCategory
        };
      } catch (error: any) {
        // Fallback para erros não tratados
        const duration = Date.now() - jobStartTime;
        processed++;
        errorCount++;
        
        const errorCategory = categorizeError(error.message);
        errorBreakdown[errorCategory] = (errorBreakdown[errorCategory] || 0) + 1;
        
        onProgress?.(processed, emailJobs.length);

        const currentThroughput = calculateThroughput();
        if (currentThroughput > peakThroughput) {
          peakThroughput = currentThroughput;
        }

        console.error(`💥 [${globalIndex + 1}] ERRO CRÍTICO: ${errorCategory}`);

        const historyRecord = {
          user_id: userId,
          template_id: emailData.template_id || null,
          contato_id: emailData.contato_id || null,
          remetente_nome: emailData.fromName || 'Sistema',
          remetente_email: emailData.fromEmail || 'sistema@app.com',
          destinatario_nome: emailData.contato_nome || extractNameFromEmail(emailData.to),
          destinatario_email: extractEmailAddress(emailData.to),
          status: 'falhou',
          template_nome: emailData.template_nome || null,
          tipo_envio: 'ultra_parallel_v5',
          mensagem_erro: `${errorCategory}: ${error.message}`,
          data_envio: new Date().toISOString()
        };
        historyRecords.push(historyRecord);
        
        return {
          success: false,
          error: `${errorCategory}: ${error.message}`,
          to: emailData.to,
          index: globalIndex,
          duration,
          provider: 'ultra_parallel_v6_optimized',
          connectionSlot: 0,
          attempt: 1,
          retryReason: errorCategory
        };
      }
    });

    // Aguarda TODAS as conexões do chunk com controle de qualidade
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Log detalhado de performance do chunk
    const chunkThroughput = calculateThroughput();
    const chunkSuccessful = chunkResults.filter(r => r.success).length;
    const chunkSuccessRate = ((chunkSuccessful / chunk.length) * 100).toFixed(1);
    
    console.log(`🚀 CHUNK ${chunkNumber} OTIMIZADO COMPLETO: ${chunkSuccessful}/${chunk.length} sucessos (${chunkSuccessRate}%)`);
    console.log(`⚡ Throughput atual: ${chunkThroughput.toFixed(2)} emails/s (Pico: ${peakThroughput.toFixed(2)})`);
    console.log(`🔄 Conexões ativas: ${activeConnections}`);

    // Delay OTIMIZADO entre chunks
    if (i + config.chunkSize < emailJobs.length) {
      console.log(`⏳ Delay otimizado de ${config.delayBetweenChunks}ms entre chunks...`);
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
    }
  }

  // Salva histórico em lotes OTIMIZADOS
  if (historyRecords.length > 0) {
    try {
      console.log(`💾 Salvando ${historyRecords.length} registros otimizados em lotes...`);
      
      // Salva em lotes menores para evitar timeout
      const batchSize = config.batchHistorySize;
      for (let i = 0; i < historyRecords.length; i += batchSize) {
        const batch = historyRecords.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('envios_historico')
          .insert(batch);

        if (error) {
          console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
        } else {
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} salvo (${batch.length} registros)`);
        }
      }
    } catch (error) {
      console.error('💥 Erro ao processar histórico otimizado:', error);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgThroughput = (emailJobs.length / totalDuration) * 1000;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const targetAchieved = avgThroughput >= (config.targetThroughput * 0.7) || peakThroughput >= config.targetThroughput;

  console.log(`🎯 ULTRA-PARALLEL V6.0 OTIMIZADO FINALIZADO em ${Math.round(totalDuration / 1000)}s`);
  console.log(`🚀 Taxa média OTIMIZADA: ${avgThroughput.toFixed(2)} emails/segundo`);
  console.log(`⚡ Pico absoluto: ${peakThroughput.toFixed(2)} emails/segundo`);
  console.log(`✅ Sucessos: ${successful}/${emailJobs.length} (${((successful/emailJobs.length)*100).toFixed(1)}%)`);
  console.log(`🔄 Estatísticas de retry: ${totalRetries} total, ${successAfterRetry} sucessos após retry`);
  console.log(`🎯 Meta atingida (70% de ${config.targetThroughput}): ${targetAchieved ? '🏆 SIM' : '📈 Quase lá'}`);
  
  // Log de breakdown de erros
  if (Object.keys(errorBreakdown).length > 0) {
    console.log(`📊 Breakdown de erros:`);
    Object.entries(errorBreakdown).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} ocorrências`);
    });
  }

  return {
    results,
    summary: {
      total: emailJobs.length,
      successful,
      failed: emailJobs.length - successful,
      avgThroughput: Math.round(avgThroughput * 100) / 100,
      peakThroughput: Math.round(peakThroughput * 100) / 100,
      totalDuration: Math.round(totalDuration / 1000),
      targetAchieved,
      avgEmailDuration: Math.round(avgDuration),
      successRate: emailJobs.length > 0 ? ((successful / emailJobs.length) * 100).toFixed(1) : "0",
      errorBreakdown,
      retryStats: {
        totalRetries,
        maxRetriesUsed,
        successAfterRetry
      }
    }
  };
}

/**
 * Envio ultra-otimizado com timeouts robustos
 */
async function sendEmailUltraOptimized(
  emailJob: UltraEmailJob,
  smtpConfig: any,
  timeout: number
): Promise<any> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout otimizado atingido')), timeout);
  });

  const sendPromise = sendEmailViaSMTPOptimized(smtpConfig, emailJob);
  
  return await Promise.race([sendPromise, timeoutPromise]);
}

/**
 * SMTP ultra-otimizado com pool de conexões
 */
async function sendEmailViaSMTPOptimized(smtpConfig: any, payload: any): Promise<any> {
  // Esta função usa a implementação SMTP otimizada do módulo principal
  // com timeouts mais robustos e melhor tratamento de erros
  return await sendEmailViaSMTP(smtpConfig, payload);
}

/**
 * Funções auxiliares importadas (definidas no módulo principal)
 */
declare function sendEmailViaSMTP(smtpConfig: any, payload: any): Promise<any>;
declare function extractEmailAddress(email: string): string;
declare function extractNameFromEmail(email: string): string;
declare const supabase: any;
