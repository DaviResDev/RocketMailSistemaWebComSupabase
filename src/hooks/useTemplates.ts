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
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Templates carregados:', data);
      
      // Transform the fetched data to ensure it has all required properties for Template type
      const templatesWithStatus = data?.map(template => ({
        ...template,
        // Ensure each template has a status property
        status: 'ativo' // Default status for all templates
      })) || [];
      
      setTemplates(templatesWithStatus);
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates: ' + error.message);
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
      // Set canal to 'email' as default
      const templateData = {
        ...formData, 
        canal: formData.canal || 'email',
        user_id: user.id
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
      }
      
      console.log('Criando template com dados:', {
        ...templateData,
        attachments: templateData.attachments ? 'presente' : 'ausente'
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
      // Set canal to 'email' as default if not provided
      const templateData = {
        ...formData, 
        canal: formData.canal || 'email'
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
      }
      
      console.log('Atualizando template com dados:', {
        ...templateData,
        attachments: templateData.attachments ? 'presente' : 'ausente'
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
    if (!user) {
      toast.error('Você precisa estar logado para enviar emails de teste');
      return false;
    }

    try {
      toast.info('Enviando email de teste...');
      
      // Get the template first
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      
      // Process template with sample data
      const currentDate = new Date();
      const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
      
      let processedContent = template.conteudo
        .replace(/{nome}/g, "Usuário Teste")
        .replace(/{email}/g, email)
        .replace(/{telefone}/g, "(00) 00000-0000")
        .replace(/{razao_social}/g, "Empresa Teste")
        .replace(/{cliente}/g, "Cliente Teste")
        .replace(/{dia}/g, formattedDate);
        
      // Add signature if it exists
      if (template.assinatura) {
        processedContent += `\n\n${template.assinatura}`;
      }
      
      // Call our send-email edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `[TESTE] ${template.nome}`,
          content: processedContent,
          isTest: true,
          signature_image: template.signature_image,
          attachments: template.attachments
        },
      });
      
      if (response.error) throw new Error(response.error.message);
      
      toast.success(`Email de teste enviado para ${email}!`);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar email de teste:', error);
      toast.error('Erro ao enviar email de teste: ' + (error.message || 'Falha na conexão com o servidor'));
      return false;
    }
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
