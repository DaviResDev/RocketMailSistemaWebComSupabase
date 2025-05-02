
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
};

export type SettingsFormData = Omit<Settings, 'id'>;

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
        setSettings(data as Settings);
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
          foto_perfil: null
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
      
      // First delete any duplicate settings (to fix the multiple rows issue)
      // This is a one-time cleanup that will ensure we only have one settings record per user
      const { error: deleteError } = await supabase
        .from('configuracoes')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) {
        console.error("Error cleaning up existing settings:", deleteError);
        // Continue anyway, we'll try to insert new settings
      }
      
      // After cleanup, insert new settings
      const { data: newData, error: insertError } = await supabase
        .from('configuracoes')
        .insert([{ 
          ...formData, 
          user_id: user.id 
        }])
        .select('*')
        .single();
      
      if (insertError) {
        console.error("Error saving settings:", insertError);
        throw insertError;
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
    uploadProfilePhoto
  };
}
