
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type Settings = {
  id: string;
  email_smtp: string | null;
  email_porta: number | null;
  email_usuario: string | null;
  email_senha: string | null;
  area_negocio: string | null;
  foto_perfil: string | null;
  smtp_seguranca: string | null; // TLS/SSL
  smtp_nome: string | null; // Nome da conta SMTP
  whatsapp_token?: string | null;
  created_at?: string | null;
  user_id?: string;
  two_factor_enabled?: boolean; // Added two_factor_enabled property
};

export type SettingsFormData = Omit<Settings, 'id' | 'created_at' | 'user_id'>;

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError("Você precisa estar logado para acessar as configurações");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get user settings - explicitly filtering by user_id
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Using maybeSingle instead of single to avoid errors when no settings exist

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        setError(`Erro ao carregar configurações: ${error.message}`);
        throw error;
      }
      
      if (data) {
        console.log("Settings loaded:", data);
        // Make sure to transform the data to match our Settings type
        setSettings({
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
          // Fix: Use type assertion to handle the two_factor_enabled property
          // until the Supabase types are regenerated
          two_factor_enabled: Boolean((data as any).two_factor_enabled)
        });
      } else {
        // No settings found, create empty settings object
        console.log("No settings found, using empty defaults");
        setSettings({
          id: 'new',
          email_smtp: '',
          email_porta: null,
          email_usuario: '',
          email_senha: '',
          area_negocio: null,
          foto_perfil: null,
          smtp_seguranca: 'tls', // Default to TLS
          smtp_nome: '',
          two_factor_enabled: false // Added two_factor_enabled default
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error.message);
      setError(`Erro ao carregar configurações: ${error.message}`);
      // Don't show toast on initial load if settings don't exist yet
      if (error.code !== 'PGRST116') {
        toast.error('Erro ao carregar configurações: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = async (formData: SettingsFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar configurações');
      return false;
    }

    try {
      setLoading(true);
      console.log("Saving settings:", formData);
      
      let result;
      
      // Check if settings already exist for this user
      if (settings && settings.id !== 'new') {
        // Settings exist, update them
        console.log("Updating existing settings with ID:", settings.id);
        result = await supabase
          .from('configuracoes')
          .update({ ...formData })
          .eq('id', settings.id)
          .eq('user_id', user.id)
          .select('*')
          .single();
      } else {
        // No settings exist, insert new ones
        console.log("Inserting new settings for user:", user.id);
        result = await supabase
          .from('configuracoes')
          .insert([{ ...formData, user_id: user.id }])
          .select('*')
          .single();
      }
      
      const { data: newData, error: saveError } = result;
      
      if (saveError) {
        console.error("Error saving settings:", saveError);
        throw saveError;
      }
      
      console.log("Settings saved successfully:", newData);
      setSettings(newData as Settings);
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testSmtpConnection = async (formData: SettingsFormData) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('test-smtp', {
        body: {
          smtp_server: formData.email_smtp,
          smtp_port: formData.email_porta,
          smtp_user: formData.email_usuario,
          smtp_password: formData.email_senha,
          smtp_security: formData.smtp_seguranca || 'tls'
        }
      });

      if (response.error) {
        throw new Error(`Teste de conexão SMTP falhou: ${response.error.message}`);
      }

      toast.success('Conexão SMTP testada com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao testar conexão SMTP:', error);
      toast.error('Erro ao testar conexão SMTP: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload de fotos');
      return null;
    }

    try {
      // Upload the photo to Supabase Storage
      const filePath = `profile-photos/${user.id}/${Date.now()}-${file.name}`;
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
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      toast.error('Erro ao fazer upload da foto de perfil: ' + error.message);
      return null;
    }
  };

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    testSmtpConnection,
    uploadProfilePhoto
  };
}
