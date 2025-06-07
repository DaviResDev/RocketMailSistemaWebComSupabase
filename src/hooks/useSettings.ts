
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
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
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

  const testSMTPConnection = async (smtpData: SMTPSettings) => {
    try {
      console.log('🔍 Testing SMTP connection...');
      
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: {
          smtp_settings: {
            host: smtpData.smtp_host,
            port: smtpData.email_porta,
            username: smtpData.email_smtp,
            password: smtpData.smtp_pass,
            from_email: smtpData.email_smtp,
            from_name: smtpData.smtp_from_name,
            security: smtpData.smtp_seguranca
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        console.log('✅ SMTP test successful');
        toast.success('Conexão SMTP testada com sucesso!');
        return true;
      } else {
        console.log('❌ SMTP test failed:', data?.error);
        toast.error('Falha no teste SMTP: ' + (data?.error || 'Erro desconhecido'));
        return false;
      }
    } catch (error: any) {
      console.error('❌ SMTP test error:', error);
      toast.error('Erro ao testar SMTP: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    fetchSettings,
    saveSettings,
    testSMTPConnection
  };
}
