
import { Json } from '@/integrations/supabase/types';

export interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
  path?: string;
}

// Tipos válidos para envio conforme constraint do banco - CORRIGIDO
export type TipoEnvio = 'individual' | 'lote' | 'agendado' | 'lote_ultra_v3' | 'gmail_optimized_v4' | 'ultra_parallel_v5';

export interface Envio {
  id: string;
  status: string;
  data_envio: string;
  attachments?: Json;
  contato_id: string;
  template_id?: string | null;
  user_id: string;
  erro?: string | null;
  contato?: {
    nome: string;
    email: string;
    telefone?: string | null;
    cliente?: string | null;
  };
  template?: {
    nome: string;
    canal?: string;
    descricao?: string | null;
    attachments?: Json;
  };
}

export interface EnvioFormData {
  contato_id: string;
  template_id: string;
  agendamento_id?: string;
  attachments?: any;
  subject?: string;
  content?: string;
  signature_image?: string;
  contato_nome?: string;
  contato_email?: string;
  to?: string;
  tipo_envio?: TipoEnvio;
}

// Helper function to convert Json attachments to proper typed array
export function parseAttachments(attachments: Json | undefined): Attachment[] {
  if (!attachments) return [];
  
  try {
    if (typeof attachments === 'string') {
      try {
        const parsed = JSON.parse(attachments);
        
        if (Array.isArray(parsed)) {
          return parsed.filter(item => 
            item && typeof item === 'object' && 'name' in item && 'url' in item
          ) as Attachment[];
        } else if (parsed && typeof parsed === 'object' && 'name' in parsed && 'url' in parsed) {
          return [parsed as Attachment];
        }
      } catch (e) {
        console.error('Error parsing attachments string:', e);
        return [];
      }
    } 
    else if (Array.isArray(attachments)) {
      return attachments.filter(item => 
        item && typeof item === 'object' && 'name' in item && 'url' in item
      ) as unknown as Attachment[];
    } 
    else if (attachments && typeof attachments === 'object' && 'name' in attachments && 'url' in attachments) {
      return [attachments as unknown as Attachment];
    }
    
    return [];
  } catch (e) {
    console.error('Error handling attachments:', e);
    return [];
  }
}

/**
 * Valida se um tipo de envio é válido conforme constraint do banco
 */
export function isValidTipoEnvio(tipo: string): tipo is TipoEnvio {
  const validTypes: TipoEnvio[] = ['individual', 'lote', 'agendado', 'lote_ultra_v3', 'gmail_optimized_v4', 'ultra_parallel_v5'];
  return validTypes.includes(tipo as TipoEnvio);
}

/**
 * Converte tipos antigos/inválidos para tipos válidos - CORRIGIDO
 */
export function normalizeTipoEnvio(tipo: string): TipoEnvio {
  // Remove caracteres especiais e converte para lowercase
  const normalizedTipo = tipo?.toString().toLowerCase().trim();
  
  switch (normalizedTipo) {
    case 'visão':
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
    case 'ultra_parallel_v5':
    case 'ultra-parallel-v5':
    case 'ultraparallelv5':
      return 'ultra_parallel_v5';
    case 'gmail_optimized_v4':
    case 'gmail-optimized-v4':
    case 'gmailoptimizedv4':
      return 'gmail_optimized_v4';
    case 'lote_ultra_v3':
    case 'lote-ultra-v3':
    case 'loteultrav3':
      return 'lote_ultra_v3';
    default:
      // Se é um tipo válido, retorna como está
      if (isValidTipoEnvio(normalizedTipo)) {
        return normalizedTipo as TipoEnvio;
      }
      // Fallback seguro
      console.warn(`Tipo de envio não reconhecido: "${tipo}". Usando 'individual' como fallback.`);
      return 'individual';
  }
}

/**
 * Configurações otimizadas por tipo de envio
 */
export interface EnvioConfig {
  maxConcurrent: number;
  chunkSize: number;
  delayBetweenChunks: number;
  timeout: number;
  retries: number;
  targetThroughput: number;
}

export const ENVIO_CONFIGS: Record<TipoEnvio, EnvioConfig> = {
  individual: {
    maxConcurrent: 1,
    chunkSize: 1,
    delayBetweenChunks: 1000,
    timeout: 15000,
    retries: 2,
    targetThroughput: 1
  },
  lote: {
    maxConcurrent: 10,
    chunkSize: 25,
    delayBetweenChunks: 2000,
    timeout: 20000,
    retries: 2,
    targetThroughput: 5
  },
  agendado: {
    maxConcurrent: 5,
    chunkSize: 10,
    delayBetweenChunks: 3000,
    timeout: 25000,
    retries: 3,
    targetThroughput: 2
  },
  lote_ultra_v3: {
    maxConcurrent: 25,
    chunkSize: 50,
    delayBetweenChunks: 1500,
    timeout: 25000,
    retries: 2,
    targetThroughput: 20
  },
  gmail_optimized_v4: {
    maxConcurrent: 15,
    chunkSize: 30,
    delayBetweenChunks: 2500,
    timeout: 30000,
    retries: 3,
    targetThroughput: 12
  },
  ultra_parallel_v5: {
    maxConcurrent: 50,
    chunkSize: 50,
    delayBetweenChunks: 2000,
    timeout: 30000,
    retries: 3,
    targetThroughput: 50
  }
};

/**
 * Obtém configuração otimizada para um tipo de envio
 */
export function getEnvioConfig(tipoEnvio: TipoEnvio): EnvioConfig {
  return ENVIO_CONFIGS[tipoEnvio] || ENVIO_CONFIGS.individual;
}

/**
 * Valida se o volume está dentro dos limites seguros
 */
export function validateVolumeLimit(tipoEnvio: TipoEnvio, volume: number): { valid: boolean, limit: number, message?: string } {
  const limits: Record<TipoEnvio, number> = {
    individual: 1,
    lote: 1000,
    agendado: 500,
    lote_ultra_v3: 2000,
    gmail_optimized_v4: 3000,
    ultra_parallel_v5: 5000
  };
  
  const limit = limits[tipoEnvio];
  const valid = volume <= limit;
  
  return {
    valid,
    limit,
    message: valid ? undefined : `Limite excedido para ${tipoEnvio}: ${volume} > ${limit}`
  };
}
