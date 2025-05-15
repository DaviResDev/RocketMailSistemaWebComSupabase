
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, SettingsFormData } from '@/types/settings';
import {
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
  testSmtpConnection
} from '@/api/settings';

export { type Settings, type SettingsFormData } from '@/types/settings';

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
      
      const settingsData = await fetchUserSettings(user.id);
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error.message);
      setError(`Erro ao carregar configurações: ${error.message}`);
      // Don't show toast on initial load if settings don't exist yet
      if (error.code !== 'PGRST116') {
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Erro ao carregar configurações: ' + error.message
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = async (formData: SettingsFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Você precisa estar logado para salvar configurações'
      });
      return false;
    }

    try {
      setLoading(true);
      const savedSettings = await saveUserSettings(formData, user.id, settings);
      
      if (savedSettings) {
        setSettings(savedSettings);
        toast({
          title: "Sucesso",
          description: 'Configurações salvas com sucesso!'
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Erro ao salvar configurações: ' + error.message
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const testSmtpConnectionWrapper = async (formData: SettingsFormData) => {
    try {
      const result = await testSmtpConnection(formData);
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Conexão testada com sucesso via ${result.provider === 'smtp' ? 'SMTP' : 'Resend'}!`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message || "Falha no teste de conexão"
        });
      }
      
      return result;
    } catch (error: any) {
      console.error("Erro ao testar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao testar: ${error.message}`
      });
      return { success: false, message: error.message };
    }
  };

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    uploadProfilePhoto: async (file: File) => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Você precisa estar logado para fazer upload de fotos'
        });
        return null;
      }
      try {
        return await uploadProfilePhoto(file, user.id);
      } catch (error: any) {
        console.error('Error uploading profile photo:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Erro ao fazer upload da foto de perfil: ' + error.message
        });
        return null;
      }
    },
    testSmtpConnection: testSmtpConnectionWrapper
  };
}
