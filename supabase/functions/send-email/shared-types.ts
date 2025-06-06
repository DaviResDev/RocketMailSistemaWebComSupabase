
// Shared types and utilities for send-email functions

// Tipos válidos para envio conforme constraint do banco
export type TipoEnvio = 'individual' | 'lote' | 'agendado' | 'lote_ultra_v3' | 'gmail_optimized_v4' | 'ultra_parallel_v5';

/**
 * Valida se um tipo de envio é válido conforme constraint do banco
 */
export function isValidTipoEnvio(tipo: string): tipo is TipoEnvio {
  const validTypes: TipoEnvio[] = ['individual', 'lote', 'agendado', 'lote_ultra_v3', 'gmail_optimized_v4', 'ultra_parallel_v5'];
  return validTypes.includes(tipo as TipoEnvio);
}

/**
 * Converte tipos antigos/inválidos para tipos válidos - NORMALIZAÇÃO ATUALIZADA
 */
export function normalizeTipoEnvio(tipo: string): TipoEnvio {
  if (!tipo || typeof tipo !== 'string') {
    console.warn(`Tipo de envio inválido: "${tipo}". Usando 'individual' como fallback.`);
    return 'individual';
  }

  // Normaliza o tipo removendo acentos, convertendo para lowercase e removendo espaços
  const normalizedTipo = tipo
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ã/g, 'a')
    .replace(/Ã/g, 'A');
  
  // Se já é um tipo válido, retorna como está
  if (isValidTipoEnvio(normalizedTipo)) {
    return normalizedTipo as TipoEnvio;
  }
  
  // Mapeia variações para tipos válidos
  switch (normalizedTipo) {
    case 'visao':
    case 'imediato':
    case 'single':
    case 'individual':
      return 'individual';
    
    case 'batch':
    case 'bulk':
    case 'lote':
      return 'lote';
    
    case 'scheduled':
    case 'agendado':
      return 'agendado';
    
    // Verifica padrões com LIKE
    default:
      if (normalizedTipo.includes('ultra_parallel') || normalizedTipo.includes('ultraparallel')) {
        return 'ultra_parallel_v5';
      }
      if (normalizedTipo.includes('gmail_optimized') || normalizedTipo.includes('gmailoptimized')) {
        return 'gmail_optimized_v4';
      }
      if (normalizedTipo.includes('lote_ultra') || normalizedTipo.includes('loteultra')) {
        return 'lote_ultra_v3';
      }
      
      // Fallback para individual
      console.warn(`Tipo de envio não reconhecido: "${tipo}". Usando 'individual' como fallback.`);
      return 'individual';
  }
}

/**
 * Função helper para garantir que o tipo_envio seja sempre normalizado antes de salvar
 */
export function prepareEnvioForDatabase(envioData: any): any {
  if (envioData.tipo_envio) {
    envioData.tipo_envio = normalizeTipoEnvio(envioData.tipo_envio);
  }
  return envioData;
}
