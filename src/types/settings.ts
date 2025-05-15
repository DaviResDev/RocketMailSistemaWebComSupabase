
export type Settings = {
  id: string;
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
};

export type SettingsFormData = Omit<Settings, 'id' | 'created_at' | 'user_id'>;
