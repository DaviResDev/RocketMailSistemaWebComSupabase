
export type TipoEnvio = 'individual' | 'lote' | 'agendado' | 'imediato';

export function normalizeTipoEnvio(tipo: string | undefined | null): TipoEnvio {
  if (!tipo) return 'imediato';
  
  // Normalize different variations to standard values
  const normalizedTipo = tipo.toLowerCase().trim();
  
  switch (normalizedTipo) {
    case 'individual':
    case 'single':
    case 'unico':
      return 'individual';
    case 'lote':
    case 'batch':
    case 'bulk':
    case 'em_lote':
      return 'lote';
    case 'agendado':
    case 'scheduled':
    case 'programado':
      return 'agendado';
    case 'imediato':
    case 'immediate':
    case 'instant':
    case 'instantaneo':
    default:
      return 'imediato';
  }
}

export interface EnvioStatus {
  id: string;
  status: 'pendente' | 'enviado' | 'erro' | 'cancelado' | 'agendado';
  error?: string;
  timestamp: string;
}

export interface Envio {
  id: string;
  user_id: string;
  template_id?: string;
  contato_id: string;
  data_envio: string;
  attachments?: any;
  status: string;
  erro?: string;
}

export interface EnvioFormData {
  template_id?: string;
  contato_id: string;
  data_envio?: string;
  attachments?: any;
  status: string;
}
