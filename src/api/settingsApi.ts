
import { supabase } from '@/integrations/supabase/client';
import { Settings, SettingsFormData } from '@/types/settings';
import { toast } from 'sonner';

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
    return {
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
      use_smtp: Boolean(data.use_smtp) // Ensure proper boolean casting
    };
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
      use_smtp: true // Default usa SMTP em vez de Resend
    };
  }
}

export async function saveUserSettings(settings: SettingsFormData, userId: string, currentSettings: Settings | null): Promise<Settings | null> {
  if (!userId) {
    toast.error('Você precisa estar logado para salvar configurações');
    return null;
  }

  console.log("Saving settings:", settings);
  
  let result;
  
  // Check if settings already exist for this user
  if (currentSettings && currentSettings.id !== 'new') {
    // Settings exist, update them
    console.log("Updating existing settings with ID:", currentSettings.id);
    result = await supabase
      .from('configuracoes')
      .update({ ...settings })
      .eq('id', currentSettings.id)
      .eq('user_id', userId)
      .select('*')
      .single();
  } else {
    // No settings exist, insert new ones
    console.log("Inserting new settings for user:", userId);
    result = await supabase
      .from('configuracoes')
      .insert([{ ...settings, user_id: userId }])
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
    use_smtp: Boolean(newData.use_smtp), // Ensure boolean type
    two_factor_enabled: Boolean(newData.two_factor_enabled) // Ensure boolean type
  } as Settings;
}

export async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  if (!userId) {
    toast.error('Você precisa estar logado para fazer upload de fotos');
    return null;
  }

  // Upload the photo to Supabase Storage
  const filePath = `profile-photos/${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file');
  }

  // Return the public URL
  return urlData.publicUrl;
}

export async function testSmtpConnection(formData: SettingsFormData): Promise<any> {
  if (!formData.email_usuario) {
    throw new Error("Preencha pelo menos o email do remetente antes de testar");
  }
  
  if (formData.use_smtp && (!formData.email_smtp || !formData.email_porta || !formData.email_senha)) {
    throw new Error("Preencha todos os campos de configuração SMTP antes de testar");
  }
  
  // Chamar a função de teste SMTP com tratamento de erro aprimorado
  try {
    const response = await supabase.functions.invoke('test-smtp', {
      body: {
        smtp_server: formData.email_smtp,
        smtp_port: Number(formData.email_porta),
        smtp_user: formData.email_usuario,
        smtp_password: formData.email_senha,
        smtp_security: formData.smtp_seguranca,
        use_resend: !formData.use_smtp,
        smtp_name: formData.smtp_nome
      },
    });
    
    console.log("Resposta do teste:", response);
    
    if (response.error) {
      console.error("Erro ao testar conexão:", response.error);
      
      // Mensagem de erro mais amigável para erros de conexão
      if (response.error.message && response.error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
      } else {
        throw new Error(`Erro ao testar conexão: ${response.error.message}`);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error("Erro ao testar conexão:", error);
    
    // Mensagem de erro mais amigável para erros comuns
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
    } else {
      throw error;
    }
  }
}
