
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
    // We need to explicitly handle the signature_image property
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
      signature_image: data.signature_image || null // Properly handle signature_image with null fallback
    };
    return settings;
  } else {
    // No settings found, create empty settings object with default true for use_smtp
    console.log("No settings found, using empty defaults with SMTP enabled");
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
      use_smtp: true, // Default to SMTP instead of Resend
      signature_image: null // Default null value for signature_image
    };
  }
}
