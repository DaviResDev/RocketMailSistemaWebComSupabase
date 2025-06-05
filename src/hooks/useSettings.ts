
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUserSettings,
  saveUserSettings,
  uploadProfilePhoto,
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
      
      // Validar e corrigir configuração SSL/TLS com base na porta
      const porta = values.email_porta || 587;
      let seguranca = values.smtp_seguranca || 'tls';
      
      if (porta === 465 && seguranca !== 'ssl') {
        console.log("⚠️ Porta 465 detectada com segurança TLS. Ajustando para SSL.");
        seguranca = 'ssl';
        values.smtp_seguranca = 'ssl';
        toast.info("A porta 465 requer segurança SSL. A configuração foi ajustada automaticamente.");
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        console.log("⚠️ Porta 587/25 detectada com segurança SSL. Ajustando para TLS.");
        seguranca = 'tls';
        values.smtp_seguranca = 'tls';
        toast.info("As portas 587 e 25 requerem segurança TLS. A configuração foi ajustada automaticamente.");
      }
      
      console.log("Saving settings with SMTP configuration:", {
        use_smtp: values.use_smtp,
        smtp_host: values.smtp_host,
        smtp_port: values.email_porta,
        smtp_security: values.smtp_seguranca,
        smtp_from_name: values.smtp_from_name,
        signature_image: values.signature_image
      });
      
      const updatedSettings = await saveUserSettings(values, user.id, settings);
      setSettings(updatedSettings);
      
      // Verificação explícita para garantir que as configurações foram salvas
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
  
  const testSmtpConnection = async (formData: SettingsFormData) => {
    try {
      // Validar e corrigir porta/segurança antes de testar
      const porta = formData.email_porta || 587;
      let seguranca = formData.smtp_seguranca || 'tls';
      
      // Correção automática SSL/TLS com base na porta
      if (porta === 465 && seguranca !== 'ssl') {
        console.log("⚠️ Porta 465 detectada com segurança TLS. Ajustando para SSL.");
        seguranca = 'ssl';
        toast.info("A porta 465 requer segurança SSL. A configuração foi ajustada para o teste.");
      } else if ((porta === 587 || porta === 25) && seguranca !== 'tls') {
        console.log("⚠️ Porta 587/25 detectada com segurança SSL. Ajustando para TLS.");
        seguranca = 'tls';
        toast.info("As portas 587 e 25 requerem segurança TLS. A configuração foi ajustada para o teste.");
      }
      
      console.log("Testing SMTP connection with data:", {
        smtp_host: formData.smtp_host,
        email_porta: porta,
        email_usuario: formData.email_usuario,
        smtp_seguranca: seguranca
      });

      const response = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_host: formData.smtp_host,
          email_porta: porta,
          email_usuario: formData.email_usuario,
          smtp_pass: formData.smtp_pass,
          smtp_seguranca: seguranca,
          smtp_from_name: formData.smtp_from_name
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        return { success: true, message: "Conexão SMTP testada com sucesso!" };
      } else {
        return { success: false, message: result.message || "Erro ao testar conexão SMTP" };
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão SMTP:', error);
      return { success: false, message: error.message || "Erro ao testar conexão SMTP" };
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
    testSmtpConnection
  };
}
