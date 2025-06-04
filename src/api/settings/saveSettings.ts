
import { supabase } from '@/integrations/supabase/client';
import type { SettingsFormData, Settings } from '@/types/settings';

export async function saveUserSettings(
  values: SettingsFormData, 
  userId: string, 
  existingSettings: Settings | null
): Promise<Settings> {
  console.log("Saving settings:", values);
  console.log("SMTP configuration being saved:", {
    use_smtp: values.use_smtp,
    smtp_host: values.smtp_host,
    smtp_pass: values.smtp_pass ? '[HIDDEN]' : null,
    smtp_from_name: values.smtp_from_name
  });

  // Prepare the settings data including new SMTP fields
  const settingsData = {
    email_smtp: values.email_smtp || null,
    email_porta: values.email_porta || null,
    email_usuario: values.email_usuario || null,
    email_senha: values.email_senha || null,
    area_negocio: values.area_negocio || null,
    foto_perfil: values.foto_perfil || null,
    smtp_seguranca: values.smtp_seguranca || 'tls',
    smtp_nome: values.smtp_nome || null,
    two_factor_enabled: values.two_factor_enabled || false,
    use_smtp: values.use_smtp || false,
    signature_image: values.signature_image || null,
    smtp_host: values.smtp_host || null, // New SMTP host field
    smtp_pass: values.smtp_pass || null, // New SMTP password field
    smtp_from_name: values.smtp_from_name || null, // New SMTP from name field
    user_id: userId
  };

  try {
    let result;
    
    if (existingSettings) {
      console.log("Updating existing settings for user:", userId);
      // Update existing settings
      const { data, error } = await supabase
        .from('configuracoes')
        .update(settingsData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating settings:", error);
        throw error;
      }
      
      result = data;
    } else {
      console.log("Inserting new settings for user:", userId);
      // Insert new settings
      const { data, error } = await supabase
        .from('configuracoes')
        .insert(settingsData)
        .select()
        .single();
      
      if (error) {
        console.error("Error inserting settings:", error);
        // If it's a unique constraint violation, try to update instead
        if (error.code === '23505') {
          console.log("Unique constraint violation, attempting update instead");
          const { data: updateData, error: updateError } = await supabase
            .from('configuracoes')
            .update(settingsData)
            .eq('user_id', userId)
            .select()
            .single();
          
          if (updateError) {
            console.error("Error in fallback update:", updateError);
            throw updateError;
          }
          
          result = updateData;
        } else {
          throw error;
        }
      } else {
        result = data;
      }
    }

    console.log("Settings saved successfully:", result);
    return result;
  } catch (error: any) {
    console.error("Error in saveUserSettings:", error);
    throw new Error(error.message || 'Erro ao salvar configurações');
  }
}
