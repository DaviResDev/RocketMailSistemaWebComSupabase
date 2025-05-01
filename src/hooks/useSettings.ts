
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
  foto_perfil: string | null;
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
          foto_perfil: null,
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
      
      if (settings && settings.id !== 'new') {
        // Atualizar configurações existentes
        const { error } = await (supabase.from('configuracoes') as AnySupabaseTable)
          .update(formData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Inserir novas configurações
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

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload de fotos');
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;
      
      console.log("Uploading profile photo:", filePath);
      
      const { error: uploadError, data } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);
      
      console.log("Profile photo uploaded successfully:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
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
