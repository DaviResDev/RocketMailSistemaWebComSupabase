
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Define the shape of attachments
export interface EnvioAttachment {
  file_name: string;
  file_path: string;
  content_type: string;
}

// Update Envio interface to include the missing properties
export interface Envio {
  id: string;
  contato_id: string;
  template_id: string;
  status: string;
  data_envio: string;
  erro: string | null;
  user_id: string;
  contato: {
    nome: string;
    email: string;
    telefone: string | null;
    razao_social: string | null;
    cliente: string | null;
  };
  template: {
    nome: string;
    conteudo: string;
    canal: string;
    assinatura: string | null;
  };
  cc?: string[];
  bcc?: string[];
  attachments?: EnvioAttachment[];
}

// Form data including email content and recipient
export interface EnvioFormData {
  contato_id: string;
  template_id: string;
  cc?: string[];
  bcc?: string[];
  attachments?: {
    file: File;
    name: string;
  }[];
}

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEnvios = useCallback(async () => {
    if (!user) {
      setError("Você precisa estar logado para ver os envios");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos (
            nome,
            email,
            telefone,
            razao_social,
            cliente
          ),
          template:templates (
            nome,
            conteudo,
            canal,
            assinatura
          )
        `)
        .eq('user_id', user.id)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('Erro ao carregar envios:', error);
        setError(`Erro ao carregar envios: ${error.message}`);
        return;
      }

      // Type guard to ensure data is not null and is an array
      if (data) {
        setEnvios(data as Envio[]);
      } else {
        setEnvios([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar envios:', error.message);
      setError(`Erro ao carregar envios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendEmail = useCallback(async (formData: EnvioFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar emails');
      return false;
    }

    try {
      setSending(true);
      setError(null);

      // Fetch template and contact details
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', formData.template_id)
        .single();

      if (templateError) {
        console.error('Erro ao carregar template:', templateError);
        toast.error(`Erro ao carregar template: ${templateError.message}`);
        return false;
      }

      const { data: contatoData, error: contatoError } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', formData.contato_id)
        .single();

      if (contatoError) {
        console.error('Erro ao carregar contato:', contatoError);
        toast.error(`Erro ao carregar contato: ${contatoError.message}`);
        return false;
      }

      if (!templateData || !contatoData) {
        toast.error('Template ou contato não encontrado.');
        return false;
      }

      // Verificar se o contato possui email
      if (!contatoData.email) {
        toast.error('Contato não possui endereço de email válido.');
        return false;
      }

      // Verificar configurações SMTP
      const { data: settingsData, error: settingsError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Erro ao carregar configurações SMTP:', settingsError);
        toast.error(`Erro ao verificar configurações SMTP: ${settingsError.message}`);
        return false;
      }

      if (!settingsData || !settingsData.email_smtp || !settingsData.email_porta || 
          !settingsData.email_usuario || !settingsData.email_senha) {
        toast.error('Configurações SMTP incompletas. Verifique suas configurações de email em "Configurações > Email".');
        return false;
      }

      // Prepare attachments for the function call
      const attachments = formData.attachments ? await Promise.all(formData.attachments.map(async (item) => {
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        const base64Content = fileContent.split(',')[1]; // Extract base64 part
        return {
          filename: item.name,
          content: base64Content,
          contentType: item.file.type,
        };
      })) : [];

      // Mostrar toast de envio em andamento
      const toastId = toast.loading('Enviando email...');

      try {
        // Call the Supabase function to send the email with improved error handling
        const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
          body: {
            to: contatoData.email,
            subject: templateData.nome,
            content: templateData.conteudo,
            cc: formData.cc,
            bcc: formData.bcc,
            contato_id: formData.contato_id,
            template_id: formData.template_id,
            user_id: user.id,
            attachments: attachments,
          },
        });

        if (functionError) {
          console.error('Erro na chamada da function:', functionError);
          toast.error(`Erro ao enviar email: ${functionError.message}`, { id: toastId });
          return false;
        }

        // Check for errors in the response body
        if (functionData && functionData.error) {
          console.error('Erro retornado pela function:', functionData.error);
          toast.error(`Erro ao enviar email: ${functionData.error}`, { id: toastId });

          // Save envio with error status
          await supabase
            .from('envios')
            .insert([
              {
                contato_id: formData.contato_id,
                template_id: formData.template_id,
                status: 'erro',
                erro: functionData.error,
                user_id: user.id,
              },
            ]);

          return false;
        }

        // Success case
        console.log('Email enviado com sucesso:', functionData);
        toast.success(`Email enviado com sucesso para ${contatoData.nome}!`, { id: toastId });
        fetchEnvios();
        return true;
      } catch (error: any) {
        console.error('Erro ao executar function de envio:', error);
        toast.error(`Erro ao enviar email: ${error.message}`, { id: toastId });
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      
      // Criar mensagem de erro mais detalhada
      let errorMessage = 'Erro ao enviar email: ';
      
      if (error.message?.includes('timeout')) {
        errorMessage += 'O envio demorou muito tempo para ser concluído. Verifique suas configurações SMTP.';
      } else if (error.message?.includes('SMTP')) {
        errorMessage += 'Erro de conexão SMTP. Verifique suas configurações de email.';
      } else {
        errorMessage += error.message;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setSending(false);
    }
  }, [user, fetchEnvios]);

  const resendEnvio = useCallback(async (envioId: string) => {
    try {
      setSending(true);
      setError(null);

      // Fetch the envio details
      const { data: envioData, error: envioError } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos (
            email
          ),
          template:templates (
            nome,
            conteudo
          )
        `)
        .eq('id', envioId)
        .single();

      if (envioError) {
        console.error('Erro ao carregar envio:', envioError);
        toast.error(`Erro ao carregar envio: ${envioError.message}`);
        return;
      }

      if (!envioData || !envioData.contato || !envioData.template) {
        toast.error('Envio, contato ou template não encontrado.');
        return;
      }

      const toastId = toast.loading('Reenviando email...');

      try {
        // Call the Supabase function to resend the email
        const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
          body: {
            to: envioData.contato.email,
            subject: envioData.template.nome,
            content: envioData.template.conteudo,
            contato_id: envioData.contato_id,
            template_id: envioData.template_id,
            user_id: user.id,
          },
        });

        if (functionError) {
          console.error('Erro ao reenviar email:', functionError);
          toast.error(`Erro ao reenviar email: ${functionError.message}`, { id: toastId });

          // Update envio with error status
          await supabase
            .from('envios')
            .update({ status: 'erro', erro: functionError.message })
            .eq('id', envioId);
          return;
        }

        if (functionData && functionData.error) {
          console.error('Erro retornado pela function:', functionData.error);
          toast.error(`Erro ao reenviar email: ${functionData.error}`, { id: toastId });

          // Update envio with error status
          await supabase
            .from('envios')
            .update({ status: 'erro', erro: functionData.error })
            .eq('id', envioId);
          return;
        }

        // Update envio with pending status
        await supabase
          .from('envios')
          .update({ status: 'entregue', erro: null })
          .eq('id', envioId);

        toast.success('Email reenviado com sucesso!', { id: toastId });
        fetchEnvios();
      } catch (error: any) {
        console.error('Erro ao reenviar email:', error);
        toast.error(`Erro ao reenviar email: ${error.message}`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast.error('Erro ao reenviar email: ' + error.message);
    } finally {
      setSending(false);
    }
  }, [user, fetchEnvios]);

  return {
    envios,
    loading,
    sending,
    error,
    fetchEnvios,
    sendEmail,
    resendEnvio
  };
}
