
import { supabase } from '@/integrations/supabase/client';
import { Settings } from './types';

export async function fetchUserSettings(userId: string): Promise<Settings | null> {
  if (!userId) {
    throw new Error("Você precisa estar logado para acessar as configurações");
  }

  // Get user settings - explicitly filtering by user_id
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // Using maybeSingle instead of single to avoid errors when no settings exist

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching settings:', error);
    throw error;
  }
  
  if (data) {
    console.log("Settings loaded:", data);
    // Make sure to transform the data to match our Settings type
    const settings: Settings = {
      id: data.id,
      email_smtp: data.email_smtp,
      email_porta: data.email_porta,
      email_usuario: data.email_usuario,
      email_senha: data.email_senha,
      area_negocio: data.area_negocio,
      foto_perfil: data.foto_perfil,
      smtp_seguranca: data.smtp_seguranca || 'tls',
      smtp_nome: data.smtp_nome || '',
      whatsapp_token: data.whatsapp_token,
      created_at: data.created_at,
      user_id: data.user_id,
      two_factor_enabled: Boolean(data.two_factor_enabled),
      use_smtp: Boolean(data.use_smtp),
      signature_image: data.signature_image || null,
      smtp_host: data.smtp_host || null, // New SMTP host field
      smtp_pass: data.smtp_pass || null, // New SMTP password field
      smtp_from_name: data.smtp_from_name || null // New SMTP from name field
    };
    return settings;
  } else {
    // No settings found, create empty settings object with default false for use_smtp
    console.log("No settings found, using empty defaults with Resend enabled");
    return {
      id: 'new',
      email_smtp: '',
      email_porta: null,
      email_usuario: '',
      email_senha: '',
      area_negocio: null,
      foto_perfil: null,
      smtp_seguranca: 'tls', // Default to TLS
      smtp_nome: '',
      two_factor_enabled: false, // Default value
      use_smtp: false, // Default to Resend instead of SMTP
      signature_image: null, // Default null value for signature_image
      smtp_host: null, // Default null for new SMTP fields
      smtp_pass: null,
      smtp_from_name: null
    };
  }
}
