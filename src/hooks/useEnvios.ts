
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Envio = {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  erro: string | null;
  user_id: string;
  cc?: string[] | null;
  bcc?: string[] | null;
  attachments?: EnvioAttachment[] | null;
  contato?: {
    nome: string;
    email: string;
    telefone: string | null;
    razao_social?: string | null;
    cliente?: string | null;
  };
  template?: {
    nome: string;
    canal: string;
    conteudo: string;
    assinatura?: string;
  };
};

export type EnvioAttachment = {
  id: string;
  envio_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
};

export type EnvioFormData = {
  contato_id: string;
  template_id: string;
  cc?: string[];
  bcc?: string[];
  attachments?: File[];
};

export function useEnvios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const fetchEnvios = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos(nome, email, telefone, razao_social, cliente),
          template:templates(nome, canal, conteudo, assinatura)
        `)
        .eq('user_id', user.id)
        .order('data_envio', { ascending: false });

      if (error) throw error;
      
      // Ensure data conforms to our type
      const processedData: Envio[] = (data || []).map(item => ({
        id: item.id,
        contato_id: item.contato_id,
        template_id: item.template_id,
        data_envio: item.data_envio,
        status: item.status,
        erro: item.erro,
        user_id: item.user_id,
        cc: item.cc,
        bcc: item.bcc,
        attachments: item.attachments,
        contato: item.contato as Envio['contato'],
        template: item.template as Envio['template']
      }));
      
      setEnvios(processedData);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de envios:', error);
      toast.error('Erro ao carregar histórico de envios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachment = async (file: File): Promise<{ path: string; name: string; type: string } | null> => {
    if (!user) return null;

    try {
      const filePath = `attachments/${user.id}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      return {
        path: filePath,
        name: file.name,
        type: file.type
      };
    } catch (error: any) {
      console.error('Erro ao fazer upload do anexo:', error);
      toast.error(`Erro ao fazer upload do anexo ${file.name}: ${error.message}`);
      return null;
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = reject;
    });
  };

  const createEnvio = async (formData: EnvioFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar mensagens');
      return false;
    }

    if (!formData.contato_id || !formData.template_id) {
      toast.error('Selecione um contato e um template para enviar a mensagem');
      return false;
    }

    setSending(true);

    try {
      console.log('Enviando mensagem com os dados:', formData);
      
      // Verificar se o contato existe
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('id, nome, email, telefone, razao_social, cliente')
        .eq('id', formData.contato_id)
        .single();
      
      if (contatoError) {
        console.error('Erro ao verificar contato:', contatoError);
        throw new Error('Contato não encontrado. Verifique se ele existe.');
      }
      
      // Verificar se o template existe
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('id, nome, canal, conteudo, assinatura')
        .eq('id', formData.template_id)
        .single();
      
      if (templateError) {
        console.error('Erro ao verificar template:', templateError);
        throw new Error('Template não encontrado. Verifique se ele existe.');
      }
      
      console.log('Contato e template verificados com sucesso');

      // Process attachments if any
      let attachmentsData = [];
      if (formData.attachments && formData.attachments.length > 0) {
        toast.info(`Preparando ${formData.attachments.length} anexos...`);
        
        // Convert all files to base64
        const attachmentPromises = formData.attachments.map(async (file) => {
          try {
            const base64Content = await fileToBase64(file);
            return {
              filename: file.name,
              content: base64Content,
              contentType: file.type
            };
          } catch (error) {
            console.error(`Failed to process attachment ${file.name}:`, error);
            toast.error(`Erro ao processar anexo ${file.name}`);
            return null;
          }
        });
        
        attachmentsData = (await Promise.all(attachmentPromises)).filter(a => a !== null);
      }

      // Criar o registro de envio
      const { data: envioData, error: envioError } = await supabase
        .from('envios')
        .insert([{
          contato_id: formData.contato_id,
          template_id: formData.template_id,
          user_id: user.id,
          status: 'pendente',
          data_envio: new Date().toISOString(),
          cc: formData.cc || null,
          bcc: formData.bcc || null
        }])
        .select();

      if (envioError) {
        console.error('Erro ao inserir envio no banco de dados:', envioError);
        throw envioError;
      }
      
      const envio = envioData?.[0];
      
      if (!envio) {
        throw new Error('Erro ao registrar o envio');
      }
      
      console.log('Envio registrado com sucesso:', envioData);
      
      // Processar template com as variáveis do contato
      let processedContent = template.conteudo
        .replace(/{nome}/g, contato.nome || '')
        .replace(/{email}/g, contato.email || '')
        .replace(/{telefone}/g, contato.telefone || '')
        .replace(/{razao_social}/g, contato.razao_social || '')
        .replace(/{cliente}/g, contato.cliente || '')
        .replace(/{dia}/g, new Date().toLocaleDateString('pt-BR'));
        
      // Adicionar assinatura se existir
      if (template.assinatura) {
        processedContent += `\n\n${template.assinatura}`;
      }

      // Check if we have email settings configured
      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
        
      if (configError) {
        console.error('Erro ao buscar configurações:', configError);
        throw new Error('Erro ao buscar configurações de email: ' + configError.message);
      }

      if (!configData || configData.length === 0 || !configData[0].email_smtp || !configData[0].email_usuario || !configData[0].email_senha) {
        console.error('Configurações incompletas:', configData);
        throw new Error('Configurações de email incompletas. Por favor, configure seu email em Configurações antes de enviar.');
      }

      // Enviar email através da edge function
      try {
        console.log('Preparando para enviar email...');
        const response = await supabase.functions.invoke('send-email', {
          body: {
            to: contato.email,
            subject: template.nome,
            content: processedContent,
            contato_id: contato.id,
            template_id: template.id,
            user_id: user.id,
            cc: formData.cc,
            bcc: formData.bcc,
            attachments: attachmentsData
          },
        });
        
        console.log('Resposta da edge function:', response);
        
        if (response.error) {
          console.error('Erro na resposta da edge function:', response.error);
          throw new Error(`Erro no serviço de email: ${response.error.message || JSON.stringify(response.error)}`);
        }
        
        if (!response.data || !response.data.success) {
          throw new Error('Resposta do servidor sem confirmação de sucesso');
        }
        
        console.log('Email enviado com sucesso');
        
        // Atualizar status do envio para entregue
        await supabase
          .from('envios')
          .update({ status: 'entregue' })
          .eq('id', envio.id);
        
        toast.success(`Mensagem "${template.nome}" enviada para ${contato.nome}!`);
        await fetchEnvios();
        return true;
        
      } catch (emailError: any) {
        console.error('Erro completo ao enviar email:', emailError);
        
        // Atualizar status do envio para erro
        await supabase
          .from('envios')
          .update({ 
            status: 'erro', 
            erro: emailError.message || 'Erro desconhecido no envio'
          })
          .eq('id', envio.id);
          
        throw new Error(`Falha ao enviar email: ${emailError.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro completo ao enviar mensagem:', error);
      toast.error(`Falha ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Function to resend a failed email
  const resendEnvio = async (envioId: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para reenviar mensagens');
      return false;
    }

    setSending(true);

    try {
      // Get the envio details
      const { data: envioData, error: envioError } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos(nome, email, telefone, razao_social, cliente),
          template:templates(nome, canal, conteudo, assinatura)
        `)
        .eq('id', envioId)
        .single();

      if (envioError) {
        console.error('Erro ao buscar dados do envio:', envioError);
        throw new Error('Erro ao buscar dados do envio para reenvio');
      }

      const envio = envioData as Envio;
      
      if (!envio.contato || !envio.template) {
        throw new Error('Dados de contato ou template incompletos para reenvio');
      }

      // Process template content
      let processedContent = envio.template.conteudo
        .replace(/{nome}/g, envio.contato.nome || '')
        .replace(/{email}/g, envio.contato.email || '')
        .replace(/{telefone}/g, envio.contato.telefone || '')
        .replace(/{razao_social}/g, envio.contato.razao_social || '')
        .replace(/{cliente}/g, envio.contato.cliente || '')
        .replace(/{dia}/g, new Date().toLocaleDateString('pt-BR'));

      // Add signature if available
      if (envio.template.assinatura) {
        processedContent += `\n\n${envio.template.assinatura}`;
      }

      // Send the email using the edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: envio.contato.email,
          subject: envio.template.nome,
          content: processedContent,
          contato_id: envio.contato_id,
          template_id: envio.template_id,
          user_id: user.id,
          cc: envio.cc || undefined,
          bcc: envio.bcc || undefined,
          attachments: envio.attachments || undefined
        },
      });

      if (response.error) {
        console.error('Erro na resposta da edge function:', response.error);
        throw new Error(`Erro no serviço de email: ${response.error.message || JSON.stringify(response.error)}`);
      }

      // Update envio status
      await supabase
        .from('envios')
        .update({ 
          status: 'entregue',
          data_envio: new Date().toISOString(),
          erro: null
        })
        .eq('id', envioId);

      toast.success(`Mensagem reenviada com sucesso para ${envio.contato.nome}!`);
      await fetchEnvios();
      return true;
    } catch (error: any) {
      console.error('Erro ao reenviar mensagem:', error);
      toast.error(`Falha ao reenviar mensagem: ${error.message || 'Erro desconhecido'}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    envios,
    loading,
    sending,
    fetchEnvios,
    createEnvio,
    resendEnvio
  };
}
