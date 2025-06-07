
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SMTPSettings {
  smtp_host: string;
  smtp_from_name: string;
  email_smtp: string;
  smtp_pass: string;
  email_porta: number;
  smtp_seguranca: 'tls' | 'ssl' | 'none';
  use_smtp: boolean;
}

export interface UserSettings {
  id?: string;
  user_id?: string;
  foto_perfil?: string | null;
  area_negocio?: string | null;
  signature_image?: string | null;
  two_factor_enabled?: boolean;
  smtp_host?: string | null;
  smtp_from_name?: string | null;
  email_smtp?: string | null;
  smtp_pass?: string | null;
  email_porta?: number | null;
  smtp_seguranca?: string | null;
  use_smtp?: boolean;
  smtp_nome?: string | null;
  email_usuario?: string | null;
  email_senha?: string | null;
}

export interface SettingsFormData {
  email_smtp: string;
  email_porta: number | null;
  email_usuario: string;
  email_senha: string;
  area_negocio: string | null;
  foto_perfil: string | null;
  smtp_seguranca: string;
  smtp_nome: string | null;
  two_factor_enabled: boolean;
  use_smtp: boolean;
  signature_image: string | null;
  smtp_host: string | null;
  smtp_pass: string | null;
  smtp_from_name: string | null;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      console.log('⚙️ Settings loaded:', data ? 'encontrado' : 'não encontrado');
      setSettings(data || {});
    } catch (error: any) {
      console.error('❌ Error loading settings:', error);
      setError(error.message);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      console.log('💾 Saving settings...', newSettings);
      
      // First check if settings exist
      const { data: existingSettings } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('configuracoes')
          .update(newSettings)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from('configuracoes')
          .insert([{ ...newSettings, user_id: user.id }])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      console.log('✅ Settings saved successfully');
      setSettings(result.data);
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
      return false;
    }
  };

  const testSmtpConnection = async (smtpData: SMTPSettings) => {
    try {
      console.log('🔍 Testing SMTP connection...');
      
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: {
          smtp_host: smtpData.smtp_host,
          email_porta: smtpData.email_porta,
          email_usuario: smtpData.email_smtp,
          smtp_pass: smtpData.smtp_pass,
          smtp_seguranca: smtpData.smtp_seguranca
        }
      });

      if (error) throw error;

      if (data?.success) {
        console.log('✅ SMTP test successful');
        toast.success('Conexão SMTP testada com sucesso!');
        return { success: true, message: 'Conexão SMTP testada com sucesso!' };
      } else {
        console.log('❌ SMTP test failed:', data?.error);
        toast.error('Falha no teste SMTP: ' + (data?.error || 'Erro desconhecido'));
        return { success: false, message: data?.error || 'Erro desconhecido' };
      }
    } catch (error: any) {
      console.error('❌ SMTP test error:', error);
      toast.error('Erro ao testar SMTP: ' + error.message);
      return { success: false, message: error.message };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    testSmtpConnection
  };
}
