import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

// Define the shape of attachments
export interface EnvioAttachment {
  file_name: string;
  file_path: string;
  content_type: string;
}

// Define custom attachment type for file uploads
export interface AttachmentFile {
  file: File;
  name: string;
}

// Update Envio interface to include the missing properties
export interface Envio {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  erro?: string;
  user_id: string;
  contato?: {
    nome: string;
    email: string;
  };
  template?: {
    nome: string;
    canal?: string;
  };
  cc?: string[];
  bcc?: string[];
  attachments?: EnvioAttachment[];
  resposta_smtp?: string; // Adicionado para armazenar resposta do servidor SMTP
  agendamento_id?: string; // Added to link to agendamentos table
}

// Update form data to include all needed properties
export interface EnvioFormData {
  contato_id: string;
  template_id: string;
  agendamento_id?: string;
  attachments?: Json | AttachmentFile[] | null;
  cc?: string[];
  bcc?: string[];
}

// Define a type specifically for attachment handling
type AttachmentType = {
  name?: string;
  filename?: string;
  content?: string;
  type?: string;
  url?: string;
  file?: File;
};

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

  const clearHistory = useCallback(async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Você precisa estar logado para limpar o histórico',
      });
      return false;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('envios')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao limpar histórico:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao limpar histórico: ${error.message}`,
        });
        return false;
      }

      setEnvios([]);
      toast({
        title: "Sucesso",
        description: 'Histórico de envios limpo com sucesso!',
      });
      return true;
    } catch (error: any) {
      console.error('Erro ao limpar histórico:', error.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao limpar histórico: ${error.message}`,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendEmail = useCallback(async (formData: EnvioFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Você precisa estar logado para enviar emails'
      });
      return false;
    }

    // Implementar proteção contra spam múltiplo (debounce)
    const now = Date.now();
    if (now - lastSendTime < DEBOUNCE_TIME) {
      toast({
        variant: "destructive",
        title: "Aguarde",
        description: 'Por favor, aguarde alguns segundos antes de enviar outro email'
      });
      return false;
    }
    setLastSendTime(now);

    // Create a unique toast notification
    toast({
      title: "Enviando email...",
      description: "Por favor, aguarde enquanto processamos seu envio."
    });
    
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao carregar template: ${templateError.message}`
        });
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao carregar contato: ${contatoError.message}`
        });
        setSending(false);
        return false;
      }

      if (!templateData || !contatoData) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Template ou contato não encontrado.'
        });
        setSending(false);
        return false;
      }

      // Validar dados críticos antes do envio
      if (!contatoData.email || !templateData.conteudo) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Dados incompletos para envio. Verifique se o contato possui email e se o template possui conteúdo."
        });
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao verificar configurações: ${settingsError.message}`
        });
        setSending(false);
        return false;
      }

      // Verificar apenas configurações básicas necessárias para Resend
      if (!settingsData) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Configurações de email não encontradas. Acesse "Configurações > Email" para configurar seus dados de envio.'
        });
        setSending(false);
        return false;
      }

      // Prepare attachments for the function call
      let attachments: AttachmentType[] = [];
      
      if (formData.attachments) {
        // Handle different types of attachments
        if (Array.isArray(formData.attachments) && formData.attachments.length > 0 && 'file' in formData.attachments[0]) {
          // Handle File objects if they exist
          const fileAttachments = formData.attachments as AttachmentFile[];
          attachments = await Promise.all(fileAttachments.map(async (item) => {
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
              type: item.file.type,
            };
          }));
        } else if (typeof formData.attachments === 'string') {
          // If it's a string, try to parse it as JSON
          try {
            const parsedAttachments = JSON.parse(formData.attachments);
            if (Array.isArray(parsedAttachments)) {
              attachments = parsedAttachments;
            }
          } catch (e) {
            console.error('Error parsing attachments string:', e);
          }
        } else if (typeof formData.attachments === 'object' && formData.attachments !== null && !Array.isArray(formData.attachments)) {
          // If it's a JSON object from Supabase
          // Convert to array if needed
          attachments = [formData.attachments as unknown as AttachmentType];
        }
      }

      // Call the Supabase function to send the email with improved error handling
      console.log("Calling send-email function with data:", {
        to: contatoData.email,
        subject: templateData.nome,
        // Don't log full content
        contato_id: formData.contato_id,
        template_id: formData.template_id,
        user_id: user.id,
        agendamento_id: formData.agendamento_id,
        hasCC: formData.cc && formData.cc.length > 0,
        hasBCC: formData.bcc && formData.bcc.length > 0
      });
      
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
          body: {
            to: contatoData.email,
            subject: templateData.nome,
            content: templateData.conteudo,
            cc: formData.cc || [],
            bcc: formData.bcc || [],
            contato_id: formData.contato_id,
            template_id: formData.template_id,
            user_id: user.id,
            agendamento_id: formData.agendamento_id,
            attachments: attachments,
            signature_image: templateData.signature_image
          },
        });

        console.log("Function response:", functionData, "Error:", functionError);

        if (functionError) {
          console.error('Erro na chamada da function:', functionError);
          
          // Mensagem de erro mais amigável para erros de conexão
          if (functionError.message && functionError.message.includes('Failed to fetch')) {
            toast({
              variant: "destructive",
              title: "Erro",
              description: 'Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.'
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro",
              description: `Erro ao enviar email: ${functionError.message}`
            });
          }
          
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
                agendamento_id: formData.agendamento_id
              },
            ]);

          return false;
        }

        // Check for errors in the response body
        if (functionData && functionData.error) {
          console.error('Erro retornado pela function:', functionData.error);
          
          // Criar mensagem mais amigável para problemas comuns
          let errorMsg = functionData.error;
          if (typeof errorMsg === 'string' && errorMsg.includes("domínio")) {
            errorMsg = "Seu domínio de email precisa ser verificado no Resend. Acesse Configurações > Email para instruções.";
          }
          
          toast({
            variant: "destructive",
            title: "Erro",
            description: `Erro ao enviar email: ${errorMsg}`
          });
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
                agendamento_id: formData.agendamento_id
              },
            ]);

          return false;
        }

        // Success case
        console.log('Email enviado com sucesso:', functionData);
        
        toast({
          title: "Sucesso",
          description: `Email enviado com sucesso para ${contatoData.nome}! Se o destinatário não receber, peça para verificar a pasta de spam.`,
          duration: 5000
        });
        
        setSending(false);
        fetchEnvios();
        return true;
      } catch (error: any) {
        console.error('Erro ao executar function de envio:', error);
        
        // Criar mensagem de erro mais específica
        let errorMessage = 'Erro ao enviar email: ';
        if (error.message?.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão ou se a função do Supabase está online.';
        } else {
          errorMessage += error.message;
        }
        
        toast({
          variant: "destructive",
          title: "Erro",
          description: errorMessage
        });
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
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage
      });
      setSending(false);
      return false;
    }
  }, [user, fetchEnvios, lastSendTime]);

  const resendEnvio = useCallback(async (envioId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Você precisa estar logado para reenviar emails'
      });
      return false;
    }
    
    toast({
      title: 'Reenviando email...',
      description: 'Aguarde enquanto processamos seu pedido.'
    });
    
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao carregar envio: ${envioError.message}`
        });
        setSending(false);
        return false;
      }

      if (!envioData || !envioData.contato || !envioData.template) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: 'Envio, contato ou template não encontrado.'
        });
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
          
          // Mensagem de erro mais amigável para erros de conexão
          if (functionError.message && functionError.message.includes('Failed to fetch')) {
            toast({
              variant: "destructive",
              title: "Erro",
              description: 'Erro de conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.'
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro",
              description: `Erro ao reenviar email: ${functionError.message}`
            });
          }
          
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
          toast({
            variant: "destructive",
            title: "Erro",
            description: `Erro ao reenviar email: ${functionData.error}`
          });
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

        toast({
          title: "Sucesso",
          description: 'Email reenviado com sucesso!'
        });
        setSending(false);
        fetchEnvios();
        return true;
      } catch (error: any) {
        console.error('Erro ao reenviar email:', error);
        
        let errorMessage = 'Erro ao reenviar email: ';
        if (error.message?.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão ou se a função do Supabase está online.';
        } else {
          errorMessage += error.message;
        }
        
        toast({
          variant: "destructive",
          title: "Erro",
          description: errorMessage
        });
        setSending(false);
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast({
        variant: "destructive",
        title: "Erro", 
        description: `Erro ao reenviar email: ${error.message}`
      });
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
    resendEnvio,
    clearHistory
  };
}
