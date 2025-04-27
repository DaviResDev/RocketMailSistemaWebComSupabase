
import { useState } from 'react';
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
};

export type SettingsFormData = Omit<Settings, 'id'>;

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (formData: SettingsFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar configurações');
      return false;
    }

    try {
      const { error } = settings
        ? await supabase
            .from('configuracoes')
            .update(formData)
            .eq('user_id', user.id)
        : await supabase
            .from('configuracoes')
            .insert([{ ...formData, user_id: user.id }]);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
      await fetchSettings();
      return true;
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
      return false;
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    saveSettings
  };
}
