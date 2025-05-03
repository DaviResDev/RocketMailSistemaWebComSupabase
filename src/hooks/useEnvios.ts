
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

      // Call the Supabase function to send the email
      const { error: functionError } = await supabase.functions.invoke('send-email', {
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
        console.error('Erro ao enviar email:', functionError);
        toast.error(`Erro ao enviar email: ${functionError.message}`);

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

      // Save envio with pending status
      await supabase
        .from('envios')
        .insert([
          {
            contato_id: formData.contato_id,
            template_id: formData.template_id,
            status: 'pendente',
            user_id: user.id,
          },
        ]);

      toast.success('Email enviado com sucesso!');
      fetchEnvios();
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar email: ' + error.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [user, fetchEnvios]);

  const resendEnvio = async (envioId: string) => {
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

      // Call the Supabase function to resend the email
      const { error: functionError } = await supabase.functions.invoke('send-email', {
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
        toast.error(`Erro ao reenviar email: ${functionError.message}`);

        // Update envio with error status
        await supabase
          .from('envios')
          .update({ status: 'erro', erro: functionError.message })
          .eq('id', envioId);
        return;
      }

      // Update envio with pending status
      await supabase
        .from('envios')
        .update({ status: 'pendente', erro: null })
        .eq('id', envioId);

      toast.success('Email reenviado com sucesso!');
      fetchEnvios();
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast.error('Erro ao reenviar email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

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
