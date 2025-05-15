
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateFormData } from '@/types/template';
import { useTemplatesData } from './useTemplatesData';
import { v4 as uuidv4 } from 'uuid';

export function useTemplateOperations() {
  const { user } = useAuth();
  const { fetchTemplates } = useTemplatesData();

  // Helper function to upload file to Supabase storage
  const uploadFileToStorage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      
      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
        .from('template_attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('template_attachments')
        .getPublicUrl(filePath);
        
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
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
        user_id: user.id,
        status: formData.status || 'ativo' // Ensure status is set
      };
      
      // Ensure attachments is properly formatted and stored
      if (templateData.attachments) {
        // Process attachments - if they are files, upload them to storage
        if (Array.isArray(templateData.attachments)) {
          const processedAttachments = [];
          
          for (const attachment of templateData.attachments) {
            // If it's a File object, upload it to storage
            if (attachment instanceof File) {
              const uploadedFile = await uploadFileToStorage(attachment);
              processedAttachments.push(uploadedFile);
            } 
            // If it's an object with file information, keep it
            else if (typeof attachment === 'object') {
              processedAttachments.push(attachment);
            }
          }
          
          // Store processed attachments as JSON string
          templateData.attachments = JSON.stringify(processedAttachments);
        } 
        // Se for um objeto mas não um array, também converter para string
        else if (typeof templateData.attachments === 'object' && !(templateData.attachments instanceof File)) {
          templateData.attachments = JSON.stringify([templateData.attachments]);
        }
        // Se for um único arquivo, processar e converter
        else if (templateData.attachments instanceof File) {
          const uploadedFile = await uploadFileToStorage(templateData.attachments);
          templateData.attachments = JSON.stringify([uploadedFile]);
        }
        // Se já for uma string, manter como está se for JSON válido
        else if (typeof templateData.attachments === 'string') {
          try {
            JSON.parse(templateData.attachments); // Verificar se é um JSON válido
          } catch (e) {
            templateData.attachments = JSON.stringify([]);
          }
        }
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
        // Process attachments - if they are files, upload them to storage
        if (Array.isArray(templateData.attachments)) {
          const processedAttachments = [];
          
          for (const attachment of templateData.attachments) {
            // If it's a File object, upload it to storage
            if (attachment instanceof File) {
              const uploadedFile = await uploadFileToStorage(attachment);
              processedAttachments.push(uploadedFile);
            } 
            // If it's an object with file information, keep it
            else if (typeof attachment === 'object') {
              processedAttachments.push(attachment);
            }
          }
          
          // Store processed attachments as JSON string
          templateData.attachments = JSON.stringify(processedAttachments);
        } 
        // Se for um objeto mas não um array, também converter para string
        else if (typeof templateData.attachments === 'object' && !(templateData.attachments instanceof File)) {
          templateData.attachments = JSON.stringify([templateData.attachments]);
        }
        // Se for um único arquivo, processar e converter
        else if (templateData.attachments instanceof File) {
          const uploadedFile = await uploadFileToStorage(templateData.attachments);
          templateData.attachments = JSON.stringify([uploadedFile]);
        }
        // Se já for uma string, manter como está se for JSON válido
        else if (typeof templateData.attachments === 'string') {
          try {
            JSON.parse(templateData.attachments); // Verificar se é um JSON válido
          } catch (e) {
            templateData.attachments = JSON.stringify([]);
          }
        }
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
      // First, get the template to access its attachments
      const { data: template, error: getError } = await supabase
        .from('templates')
        .select('attachments')
        .eq('id', id)
        .single();
        
      if (getError) throw getError;
      
      // Delete attached files from storage if they exist
      if (template.attachments) {
        try {
          // Corrigindo o erro TS2345: garantindo que attachments seja string antes de passar para JSON.parse
          const attachmentsStr = typeof template.attachments === 'string' 
            ? template.attachments 
            : JSON.stringify(template.attachments);
            
          const attachments = JSON.parse(attachmentsStr);
          
          if (Array.isArray(attachments)) {
            for (const attachment of attachments) {
              if (attachment.path) {
                await supabase.storage
                  .from('template_attachments')
                  .remove([attachment.path]);
              }
            }
          }
        } catch (e) {
          console.error('Erro ao analisar anexos:', e);
        }
      }
      
      // Delete the template from the database
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
