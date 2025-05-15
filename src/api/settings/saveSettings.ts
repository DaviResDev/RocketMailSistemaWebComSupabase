
import { supabase } from '@/integrations/supabase/client';
import { Settings, SettingsFormData } from './types';
import { toast } from 'sonner';

export async function saveUserSettings(
  settings: SettingsFormData, 
  userId: string, 
  currentSettings: Settings | null
): Promise<Settings | null> {
  if (!userId) {
    toast.error('Você precisa estar logado para salvar configurações');
    return null;
  }

  console.log("Saving settings:", settings);
  
  // Create a data object that only includes fields that exist in the database
  // This prevents errors when trying to save fields that don't exist in the database yet
  const settingsToSave = {
    email_smtp: settings.email_smtp,
    email_porta: settings.email_porta,
    email_usuario: settings.email_usuario,
    email_senha: settings.email_senha,
    area_negocio: settings.area_negocio,
    foto_perfil: settings.foto_perfil,
    smtp_seguranca: settings.smtp_seguranca,
    smtp_nome: settings.smtp_nome,
    whatsapp_token: settings.whatsapp_token,
    two_factor_enabled: settings.two_factor_enabled,
    use_smtp: settings.use_smtp,
    signature_image: settings.signature_image // Include signature_image in the settingsToSave object
  };
  
  let result;
  
  // Check if settings already exist for this user
  if (currentSettings && currentSettings.id !== 'new') {
    // Settings exist, update them
    console.log("Updating existing settings with ID:", currentSettings.id);
    result = await supabase
      .from('configuracoes')
      .update({ ...settingsToSave })
      .eq('id', currentSettings.id)
      .eq('user_id', userId)
      .select('*')
      .single();
  } else {
    // No settings exist, insert new ones
    console.log("Inserting new settings for user:", userId);
    result = await supabase
      .from('configuracoes')
      .insert([{ ...settingsToSave, user_id: userId }])
      .select('*')
      .single();
  }
  
  const { data: newData, error: saveError } = result;
  
  if (saveError) {
    console.error("Error saving settings:", saveError);
    throw saveError;
  }
  
  console.log("Settings saved successfully:", newData);
  
  // Make sure to transform the data to match our Settings type
  return {
    ...newData,
    use_smtp: Boolean(newData.use_smtp),
    two_factor_enabled: Boolean(newData.two_factor_enabled),
    signature_image: newData.signature_image === undefined ? null : newData.signature_image
  } as Settings;
}
