
import { Json } from '@/integrations/supabase/types';

export interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
  path?: string;
}

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
}

// Helper function to convert Json attachments to proper typed array
export function parseAttachments(attachments: Json | undefined): Attachment[] {
  if (!attachments) return [];
  
  try {
    if (typeof attachments === 'string') {
      return JSON.parse(attachments);
    } else if (Array.isArray(attachments)) {
      return attachments;
    }
    return [attachments];
  } catch (e) {
    console.error('Error parsing attachments:', e);
    return [];
  }
}
