
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
 * Interface unificada para solicitação de email
 */
export interface EmailRequest {
  templateId: string;
  contactId: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject?: string;
  content?: string;
  tipoEnvio?: string;
  templateName?: string;
  htmlContent?: string;
  endpointUrl?: string;
  apiKey?: string;
}

/**
 * Interface para resultado de email individual
 */
export interface EmailResult {
  success: boolean;
  contactId: string;
  templateId: string;
  toEmail: string;
  toName: string;
  fromEmail: string;
  fromName: string;
  error?: string;
  templateName?: string;
  tipoEnvio?: string;
}

/**
 * Interface para resultado de processamento em lote
 */
export interface BatchProcessingResult {
  successCount: number;
  errorCount: number;
  totalCount: number;
  timeElapsed: number;
  results: EmailResult[];
}

/**
 * Interface para entrada de dados de email (nova interface unificada)
 */
export interface EmailRequestData {
  // Formato antigo - templateId + contacts
  templateId?: string;
  contacts?: string[];
  
  // Formato novo - batch + emails
  batch?: boolean;
  emails?: Array<{
    to: string;
    contato_id: string;
    template_id: string;
    contato_nome: string;
    subject?: string;
    content?: string;
    template_nome?: string;
    contact?: any;
    image_url?: string;
    signature_image?: string;
    attachments?: any;
    index?: number;
  }>;
  
  // Configurações SMTP
  smtp_settings?: {
    host: string;
    port: number;
    secure: boolean;
    password: string;
    from_name: string;
    from_email: string;
  };
  
  use_smtp?: boolean;
  gmail_optimized?: boolean;
  target_throughput?: number;
  max_concurrent?: number;
  chunk_size?: number;
  
  // Campos comuns
  subject?: string;
  content?: string;
  tipo_envio?: string;
  
  // Rate limiting
  rate_limit?: {
    emails_per_second: number;
    burst_limit: number;
  };
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
