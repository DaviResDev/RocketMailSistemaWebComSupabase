
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import { Template, TemplateFormData } from '@/types/template';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Templates carregados:', data);
      
      // Transform the fetched data to ensure it has all required properties for Template type
      const formattedTemplates: Template[] = data?.map(template => ({
        ...template,
        status: 'ativo', // Always provide a default status since it's required now
        conteudo: template.conteudo || '' // Garante que conteudo nunca seja null
      })) || [];
      
      setTemplates(formattedTemplates);
      return formattedTemplates;
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates: ' + (error.message || 'Falha na conexão com o servidor'));
      throw error; // Re-throw to allow caller to handle
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (formData: TemplateFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return false;
    }

    try {
      // Set default value for email
      const templateData = {
        ...formData,
        canal: 'email', // Always set to email since it's the only option now
        user_id: user.id
      };
      
      // Update default welcome template content - NEW CONTENT
      if (templateData.nome === 'Template de Boas-vindas' || templateData.conteudo.includes('Seja bem-vindo ao')) {
        templateData.conteudo = `Olá {nome},

Seja bem-vindo ao RocketMail!

Atenciosamente,
Equipe RocketMail`;
      }
      
      // Ensure attachments is properly formatted and stored
      if (templateData.attachments) {
        // Se for um array, converter para string JSON
        if (Array.isArray(templateData.attachments)) {
          templateData.attachments = JSON.stringify(templateData.attachments);
        } 
        // Se for um objeto mas não um array, também converter para string
        else if (typeof templateData.attachments === 'object') {
          templateData.attachments = JSON.stringify(templateData.attachments);
        }
        // Se já for uma string, manter como está
      }
      
      console.log('Criando template com dados:', {
        ...templateData,
        attachments: templateData.attachments ? 'presente' : 'ausente',
        signature_image: templateData.signature_image ? 'presente' : 'ausente'
      });
      
      const { error } = await supabase
        .from('templates')
        .insert([templateData]);

      if (error) throw error;
      toast.success('Template criado com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Erro ao criar template:', error);
      toast.error('Erro ao criar template: ' + error.message);
      return false;
    }
  };

  const updateTemplate = async (id: string, formData: TemplateFormData) => {
    try {
      // Always set to 'email' for backwards compatibility
      const templateData = {
        ...formData, 
        canal: 'email'
      };
      
      // Update default welcome template content - NEW CONTENT
      if (templateData.nome === 'Template de Boas-vindas' || templateData.conteudo.includes('Seja bem-vindo ao')) {
        templateData.conteudo = `Olá {nome},

Seja bem-vindo ao RocketMail!

Atenciosamente,
Equipe RocketMail`;
      }
      
      // Ensure attachments is properly formatted and stored
      if (templateData.attachments) {
        // Se for um array, converter para string JSON
        if (Array.isArray(templateData.attachments)) {
          templateData.attachments = JSON.stringify(templateData.attachments);
        } 
        // Se for um objeto mas não um array, também converter para string
        else if (typeof templateData.attachments === 'object') {
          templateData.attachments = JSON.stringify(templateData.attachments);
        }
        // Se já for uma string, manter como está
      }
      
      console.log('Atualizando template com dados:', {
        ...templateData,
        attachments: templateData.attachments ? 'presente' : 'ausente',
        signature_image: templateData.signature_image ? 'presente' : 'ausente'
      });
      
      const { error } = await supabase
        .from('templates')
        .update(templateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Template atualizado com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar template:', error);
      toast.error('Erro ao atualizar template: ' + error.message);
      return false;
    }
  };

  const duplicateTemplate = async (id: string) => {
    try {
      // Get the original template
      const { data: template, error: getError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) throw getError;
      
      // Create a new template with the same content but different name
      const newTemplate = {
        nome: `${template.nome} (Cópia)`,
        conteudo: template.conteudo,
        canal: template.canal || 'email',
        assinatura: template.assinatura,
        signature_image: template.signature_image,
        attachments: template.attachments,
        status: 'ativo', // Ensure the duplicated template has a status
        user_id: user?.id
      };
      
      const { error: insertError } = await supabase
        .from('templates')
        .insert([newTemplate]);
        
      if (insertError) throw insertError;
      
      toast.success('Template duplicado com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Erro ao duplicar template:', error);
      toast.error('Erro ao duplicar template: ' + error.message);
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template excluído com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template: ' + error.message);
      return false;
    }
  };

  const sendTestEmail = async (templateId: string, email: string) => {
    // Email sending functionality has been removed
    console.log("Email sending functionality has been disabled");
    toast.error('Funcionalidade de envio de email foi removida do sistema. Use apenas para visualizar templates.');
    return false;
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    sendTestEmail
  };
}
