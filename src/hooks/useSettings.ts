
import React, { useState, useCallback } from 'react';
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

// Generic type to help with Supabase client typing
type SupabaseFrom = typeof supabase.from;
type AnySupabaseTable = ReturnType<SupabaseFrom>;

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
      // Using type assertion to bypass type checking since 'configuracoes' 
      // is not defined in the TypeScript types
      const { data, error } = await (supabase.from('configuracoes') as AnySupabaseTable)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching settings:', error);
        setError(`Erro ao carregar configurações: ${error.message}`);
        throw error;
      }
      
      if (data && data.length > 0) {
        setSettings(data[0] as Settings);
      } else {
        // No settings found, create empty settings
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
      
      // First check if settings exist for this user
      const { data: existingSettings, error: checkError } = await (supabase.from('configuracoes') as AnySupabaseTable)
        .select('id')
        .eq('user_id', user.id);
        
      if (checkError) {
        throw checkError;
      }
      
      if (existingSettings && existingSettings.length > 0) {
        // Update existing settings
        const { error } = await (supabase.from('configuracoes') as AnySupabaseTable)
          .update(formData)
          .eq('id', existingSettings[0].id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await (supabase.from('configuracoes') as AnySupabaseTable)
          .insert([{ ...formData, user_id: user.id }]);

        if (error) throw error;
      }
      
      toast.success('Configurações salvas com sucesso!');
      await fetchSettings();
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
