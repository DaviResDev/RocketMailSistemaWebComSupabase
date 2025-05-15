
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateFormData } from '@/types/template';
import { useTemplatesData } from './useTemplatesData';

export function useTemplateOperations() {
  const { user } = useAuth();
  const { fetchTemplates } = useTemplatesData();

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
        user_id: user.id,
        status: formData.status || 'ativo' // Ensure status is set
      };
      
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
      } else {
        // Ensure attachments is always at least an empty array
        templateData.attachments = JSON.stringify([]);
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
        canal: 'email',
        status: formData.status || 'ativo' // Ensure status is set
      };
      
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
      } else {
        // Ensure attachments is always at least an empty array
        templateData.attachments = JSON.stringify([]);
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
        attachments: template.attachments || JSON.stringify([]),
        status: template.status || 'ativo', // Ensure the duplicated template has a status
        user_id: user?.id
      };
      
      console.log('Duplicando template:', {
        nome: newTemplate.nome,
        status: newTemplate.status,
        attachments: newTemplate.attachments ? 'presente' : 'ausente'
      });
      
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

  return {
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate
  };
}
