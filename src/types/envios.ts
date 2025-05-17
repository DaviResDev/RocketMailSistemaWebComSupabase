
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
