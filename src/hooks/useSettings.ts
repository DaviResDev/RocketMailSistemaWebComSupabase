import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
  testSmtpConnection,
  type Settings,
  type SettingsFormData
} from '@/api/settings';

// Re-export types for convenience
export type { Settings, SettingsFormData };

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

  const saveSettings = async (values: SettingsFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure user is authenticated
      if (!user) {
        throw new Error('Você precisa estar logado para salvar configurações');
      }
      
      console.log("Saving settings with signature_image:", values.signature_image);
      
      const updatedSettings = await saveUserSettings(values, user.id, settings);
      setSettings(updatedSettings);
      
      // Verificação explícita para garantir que a assinatura foi salva
      if (values.signature_image && updatedSettings?.signature_image !== values.signature_image) {
        console.warn("Assinatura não foi salva corretamente:", {
          requested: values.signature_image,
          saved: updatedSettings?.signature_image
        });
        throw new Error('Erro ao salvar assinatura digital. Tente novamente.');
      }
      
      toast.success('Configurações salvas com sucesso!');
      return updatedSettings;
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      setError(error.message || 'Erro ao salvar configurações');
      toast.error(`Erro ao salvar configurações: ${error.message}`);
      return null;
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
