
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
  whatsapp_token: string | null;
  foto_perfil: string | null;
  area_negocio: string | null;
};

export type SettingsFormData = Omit<Settings, 'id'>;

// Generic type to help with Supabase client typing
type SupabaseFrom = typeof supabase.from;
type AnySupabaseTable = ReturnType<SupabaseFrom>;

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Using type assertion to bypass type checking since 'configuracoes' 
      // is not defined in the TypeScript types
      const { data, error } = await (supabase.from('configuracoes') as AnySupabaseTable)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as Settings | null);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error.message);
      toast.error('Erro ao carregar configurações: ' + error.message);
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
      if (settings) {
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
      toast.error('Erro ao salvar configurações: ' + error.message);
      return false;
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
      
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast.error('Erro ao fazer upload da foto: ' + error.message);
      return null;
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    saveSettings,
    uploadProfilePhoto
  };
}
