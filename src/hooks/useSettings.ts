
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
      
      // Get user settings
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
          area_negocio: null
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
      
      // First check if settings exist for this user
      const { data: existingSettings, error: checkError } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing settings:", checkError);
        throw checkError;
      }
      
      let result;
      
      if (existingSettings?.id) {
        console.log("Updating existing settings with ID:", existingSettings.id);
        // Update existing settings
        result = await supabase
          .from('configuracoes')
          .update(formData)
          .eq('id', existingSettings.id);
      } else {
        console.log("Creating new settings for user:", user.id);
        // Insert new settings
        result = await supabase
          .from('configuracoes')
          .insert([{ ...formData, user_id: user.id }]);
      }

      if (result.error) {
        console.error("Error saving settings:", result.error);
        throw result.error;
      }
      
      console.log("Settings saved successfully");
      toast.success('Configurações salvas com sucesso!');
      await fetchSettings(); // Reload settings after saving
      return true;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings
  };
}
