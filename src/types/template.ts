
export interface Template {
  id: string;
  nome: string;
  conteudo: string;
  canal?: string;
  assinatura?: string;
  created_at?: string;
  user_id?: string;
  signature_image?: string | null;
  status?: string; // Make status optional since it might not exist in the database
  attachments?: any;
}

export interface TemplateFormData {
  nome: string;
  conteudo: string;
  assinatura?: string;
  signature_image?: string | null;
  status?: string; // Make status optional to match the database structure
  attachments?: any;
}
