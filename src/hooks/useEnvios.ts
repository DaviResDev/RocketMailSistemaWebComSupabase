
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
  agendamento_id?: string;
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

  // Adicionar controle de debounce para evitar envios duplicados
  const [lastSendTime, setLastSendTime] = useState<number>(0);
  const DEBOUNCE_TIME = 3000; // 3 segundos

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

    // Implementar proteção contra spam múltiplo (debounce)
    const now = Date.now();
    if (now - lastSendTime < DEBOUNCE_TIME) {
      toast.warning('Por favor, aguarde alguns segundos antes de enviar outro email');
      return false;
    }
    setLastSendTime(now);

    // Create a unique toast ID we can reference later
    const toastId = toast.loading('Enviando email...');
    
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
        toast.error(`Erro ao carregar template: ${templateError.message}`, { id: toastId });
        setSending(false);
        return false;
      }

      const { data: contatoData, error: contatoError } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', formData.contato_id)
        .single();

      if (contatoError) {
        console.error('Erro ao carregar contato:', contatoError);
        toast.error(`Erro ao carregar contato: ${contatoError.message}`, { id: toastId });
        setSending(false);
        return false;
      }

      if (!templateData || !contatoData) {
        toast.error('Template ou contato não encontrado.', { id: toastId });
        setSending(false);
        return false;
      }

      // Validar dados críticos antes do envio
      if (!contatoData.email || !templateData.conteudo) {
        toast.error("Dados incompletos para envio. Verifique se o contato possui email e se o template possui conteúdo.", { id: toastId });
        setSending(false);
        return false;
      }

      // Verificar se o usuário possui configurações básicas de email
      const { data: settingsData, error: settingsError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Erro ao carregar configurações:', settingsError);
        toast.error(`Erro ao verificar configurações: ${settingsError.message}`, { id: toastId });
        setSending(false);
        return false;
      }

      // Verificar apenas configurações básicas necessárias para Resend
      if (!settingsData) {
        toast.error('Configurações de email não encontradas. Acesse "Configurações > Email" para configurar seus dados de envio.', { id: toastId });
        setSending(false);
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

      // Call the Supabase function to send the email with improved error handling
      console.log("Calling send-email function with data:", {
        to: contatoData.email,
        subject: templateData.nome,
        // Don't log full content
        contato_id: formData.contato_id,
        template_id: formData.template_id,
        user_id: user.id,
        agendamento_id: formData.agendamento_id
      });
      
      try {
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
            agendamento_id: formData.agendamento_id,
            attachments: attachments,
          },
        });

        console.log("Function response:", functionData, "Error:", functionError);

        if (functionError) {
          console.error('Erro na chamada da function:', functionError);
          toast.error(`Erro ao enviar email: ${functionError.message}`, { id: toastId });
          setSending(false);

          // Save envio with error status
          await supabase
            .from('envios')
            .insert([
              {
                contato_id: formData.contato_id,
                template_id: formData.template_id,
                status: 'erro',
                erro: functionError.message,
                user_id: user.id,
              },
            ]);

          return false;
        }

        // Check for errors in the response body
        if (functionData && functionData.error) {
          console.error('Erro retornado pela function:', functionData.error);
          
          // Criar mensagem mais amigável para problemas comuns
          let errorMsg = functionData.error;
          if (functionData.error.includes("domínio")) {
            errorMsg = "Seu domínio de email precisa ser verificado no Resend. Acesse Configurações > Email para instruções.";
          }
          
          toast.error(`Erro ao enviar email: ${errorMsg}`, { id: toastId });
          setSending(false);

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
        
        // Use a string template instead of JSX
        toast.success(`Email enviado com sucesso para ${contatoData.nome}! Se o destinatário não receber, peça para verificar a pasta de spam.`, 
          { id: toastId, duration: 5000 }
        );
        
        setSending(false);
        fetchEnvios();
        return true;
      } catch (error: any) {
        console.error('Erro ao executar function de envio:', error);
        toast.error(`Erro ao enviar email: ${error.message}`, { id: toastId });
        setSending(false);
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      
      // Criar mensagem de erro mais detalhada
      let errorMessage = 'Erro ao enviar email: ';
      
      if (error.message?.includes('timeout')) {
        errorMessage += 'O envio demorou muito tempo para ser concluído.';
      } else {
        errorMessage += error.message;
      }
      
      toast.error(errorMessage, { id: toastId });
      setSending(false);
      return false;
    }
  }, [user, fetchEnvios, lastSendTime]);

  const resendEnvio = useCallback(async (envioId: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para reenviar emails');
      return false;
    }
    
    const toastId = toast.loading('Reenviando email...');
    
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
        toast.error(`Erro ao carregar envio: ${envioError.message}`, { id: toastId });
        setSending(false);
        return false;
      }

      if (!envioData || !envioData.contato || !envioData.template) {
        toast.error('Envio, contato ou template não encontrado.', { id: toastId });
        setSending(false);
        return false;
      }

      try {
        console.log("Attempting to resend email with data:", {
          to: envioData.contato.email,
          subject: envioData.template.nome,
          contato_id: envioData.contato_id,
          template_id: envioData.template_id,
          user_id: user.id,
        });
        
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

        console.log("Resend function response:", functionData, "Error:", functionError);

        if (functionError) {
          console.error('Erro ao reenviar email:', functionError);
          toast.error(`Erro ao reenviar email: ${functionError.message}`, { id: toastId });
          setSending(false);

          // Update envio with error status
          await supabase
            .from('envios')
            .update({ status: 'erro', erro: functionError.message })
            .eq('id', envioId);
          return false;
        }

        if (functionData && functionData.error) {
          console.error('Erro retornado pela function:', functionData.error);
          toast.error(`Erro ao reenviar email: ${functionData.error}`, { id: toastId });
          setSending(false);

          // Update envio with error status
          await supabase
            .from('envios')
            .update({ status: 'erro', erro: functionData.error })
            .eq('id', envioId);
          return false;
        }

        // Update envio with success status
        await supabase
          .from('envios')
          .update({ status: 'entregue', erro: null })
          .eq('id', envioId);

        toast.success('Email reenviado com sucesso!', { id: toastId });
        setSending(false);
        fetchEnvios();
        return true;
      } catch (error: any) {
        console.error('Erro ao reenviar email:', error);
        toast.error(`Erro ao reenviar email: ${error.message}`, { id: toastId });
        setSending(false);
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast.error(`Erro ao reenviar email: ${error.message}`, { id: toastId });
      setSending(false);
      return false;
    } finally {
      setSending(false); // Ensure sending state is reset in all cases
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
