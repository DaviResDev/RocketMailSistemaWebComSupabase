
export interface Template {
  id: string;
  nome: string;
  conteudo: string;
  canal?: string;
  assinatura?: string;
  created_at?: string;
  user_id?: string;
  signature_image?: string | null;
  status: string;
  attachments?: any;
  descricao?: string; // Add description field
}

export interface TemplateFormData {
  nome: string;
  conteudo: string;
  assinatura?: string;
  signature_image?: string | null;
  status: string;
  attachments?: any;
  descricao?: string; // Add description field
}
