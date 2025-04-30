
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

export type EnvioFormData = {
  contato_id: string;
  template_id: string;
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
        contato: item.contato as Envio['contato'],
        template: item.template as Envio['template']
      }));
      
      setEnvios(processedData);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de envios:', error.message);
      toast.error('Erro ao carregar histórico de envios: ' + error.message);
    } finally {
      setLoading(false);
    }
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

      // Criar o registro de envio
      const { data: envioData, error: envioError } = await supabase
        .from('envios')
        .insert([{
          ...formData,
          user_id: user.id,
          status: 'pendente',
          data_envio: new Date().toISOString()
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

      // Enviar email através da edge function
      if (template.canal === 'email' || template.canal === 'ambos') {
        try {
          const response = await supabase.functions.invoke('send-email', {
            body: {
              to: contato.email,
              subject: template.nome,
              content: processedContent,
              contato_id: contato.id,
              template_id: template.id
            },
          });
          
          if (response.error) {
            throw new Error(`Erro no serviço de email: ${response.error.message}`);
          }
          
          console.log('Email enviado com sucesso');
          
        } catch (emailError: any) {
          console.error('Erro ao enviar email:', emailError);
          
          // Atualizar status do envio para erro
          await supabase
            .from('envios')
            .update({ status: 'erro', erro: emailError.message })
            .eq('id', envio.id);
            
          throw new Error(`Falha ao enviar email: ${emailError.message}`);
        }
      }
      
      // Envio de WhatsApp seria implementado de forma similar
      if (template.canal === 'whatsapp' || template.canal === 'ambos') {
        // A ser implementado com uma edge function para WhatsApp
        console.log('Envio de WhatsApp não implementado ainda');
      }
      
      // Atualizar status do envio para entregue
      await supabase
        .from('envios')
        .update({ status: 'entregue' })
        .eq('id', envio.id);
      
      toast.success(`Mensagem "${template.nome}" enviada para ${contato.nome}!`);
      await fetchEnvios();
      return true;
    } catch (error: any) {
      console.error('Erro completo ao enviar mensagem:', error);
      toast.error(`Falha ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
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
    createEnvio
  };
}
