
export interface Template {
  id: string;
  nome: string;
  conteudo: string;
  canal?: string;
  assinatura?: string;
  created_at?: string;
  user_id?: string;
  signature_image?: string | null;
  status: string; // Required status property
  attachments?: any; // Attachments property
}

export interface TemplateFormData {
  nome: string;
  conteudo: string;
  canal?: string;
  assinatura?: string;
  signature_image?: string | null;
  status: string; // Required status property
  attachments?: any; // Attachments property
}
