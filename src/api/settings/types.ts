
// Define the types directly rather than re-exporting
export type Settings = {
  id: string; // Make id required instead of optional
  email_smtp: string | null;
  email_porta: number | null;
  email_usuario: string | null;
  email_senha: string | null;
  area_negocio: string | null;
  foto_perfil: string | null;
  smtp_seguranca: string | null; // TLS/SSL
  smtp_nome: string | null; // Nome da conta de email
  whatsapp_token?: string | null;
  created_at?: string | null;
  user_id?: string;
  two_factor_enabled: boolean;
  use_smtp: boolean; // Property to control if SMTP is used instead of Resend
  signature_image: string | null; // URL da imagem da assinatura digital
  smtp_host: string | null; // New SMTP host field
  smtp_pass: string | null; // New SMTP password field
  smtp_from_name: string | null; // New SMTP from name field
};

export type SettingsFormData = Omit<Settings, 'id' | 'created_at' | 'user_id'>;
