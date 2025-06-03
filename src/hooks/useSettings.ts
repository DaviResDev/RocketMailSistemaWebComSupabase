
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
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
      console.log("Settings loaded:", settingsData);
      setSettings(settingsData);
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
      
      // Enhanced success message based on configuration
      if (values.use_smtp) {
        toast.success('Configurações salvas! Sistema híbrido SMTP + Resend ativado.');
      } else {
        toast.success('Configurações salvas! Usando apenas Resend para envios.');
      }
      
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
      // Show informative message about the hybrid system
      if (formData.use_smtp) {
        toast.info('Testando configuração SMTP... Em produção, haverá fallback para Resend se necessário.');
      }
      
      const result = await testSmtpConnection(formData);
      
      if (result.success) {
        if (result.provider === 'smtp') {
          toast.success('✅ Conexão SMTP testada com sucesso! Sistema híbrido funcionando.');
        } else {
          toast.success(`✅ Fallback testado com sucesso via ${result.provider}!`);
        }
      } else {
        toast.error(result.message || "Falha no teste de conexão");
      }
      
      return result;
    } catch (error: any) {
      console.error("Erro ao testar configurações:", error);
      toast.error(`Erro ao testar: ${error.message}`);
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
        toast.error('Você precisa estar logado para fazer upload de fotos');
        return null;
      }
      try {
        return await uploadProfilePhoto(file, user.id);
      } catch (error: any) {
        console.error('Error uploading profile photo:', error);
        toast.error('Erro ao fazer upload da foto de perfil: ' + error.message);
        return null;
      }
    },
    testSmtpConnection: testSmtpConnectionWrapper
  };
}
