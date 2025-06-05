
import { Json } from '@/integrations/supabase/types';

export interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
  path?: string;
}

// Tipos válidos para envio conforme constraint do banco
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
  to?: string; // Explicit recipient email address
  tipo_envio?: TipoEnvio; // Garantir que apenas valores válidos sejam usados
}

// Helper function to convert Json attachments to proper typed array
export function parseAttachments(attachments: Json | undefined): Attachment[] {
  if (!attachments) return [];
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof attachments === 'string') {
      try {
        const parsed = JSON.parse(attachments);
        
        // Ensure the parsed result is an array of valid Attachment objects
        if (Array.isArray(parsed)) {
          return parsed.filter(item => 
            item && typeof item === 'object' && 'name' in item && 'url' in item
          ) as Attachment[];
        } else if (parsed && typeof parsed === 'object' && 'name' in parsed && 'url' in parsed) {
          // Single attachment object
          return [parsed as Attachment];
        }
      } catch (e) {
        console.error('Error parsing attachments string:', e);
        return [];
      }
    } 
    // If it's already an array, filter for valid attachment objects
    else if (Array.isArray(attachments)) {
      return attachments.filter(item => 
        item && typeof item === 'object' && 'name' in item && 'url' in item
      ) as unknown as Attachment[];
    } 
    // If it's an object with name and url, treat as single attachment
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
 * Converte tipos antigos/inválidos para tipos válidos
 */
export function normalizeTipoEnvio(tipo: string): TipoEnvio {
  switch (tipo?.toLowerCase()) {
    case 'visão':
    case 'imediato':
    case 'single':
      return 'individual';
    case 'batch':
    case 'bulk':
      return 'lote';
    case 'scheduled':
      return 'agendado';
    case 'ultra_parallel_v5':
      return 'ultra_parallel_v5';
    case 'gmail_optimized_v4':
      return 'gmail_optimized_v4';
    case 'lote_ultra_v3':
      return 'lote_ultra_v3';
    default:
      return isValidTipoEnvio(tipo) ? tipo as TipoEnvio : 'individual';
  }
}
