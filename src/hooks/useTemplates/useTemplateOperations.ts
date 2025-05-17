
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateFormData } from '@/types/template';
import { useTemplatesData } from './useTemplatesData';
import { v4 as uuidv4 } from 'uuid';
import { useSettings } from '@/hooks/useSettings';

export function useTemplateOperations() {
  const { user } = useAuth();
  const { fetchTemplates } = useTemplatesData();
  const { settings } = useSettings();

  // Helper function to upload file to storage
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

  // Function to upload template file
  const uploadTemplateFile = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      
      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
        .from('template_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('template_files')
        .getPublicUrl(filePath);
        
      return {
        url: publicUrl,
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading template file:', error);
      throw error;
    }
  };

  const createTemplate = async (formData: TemplateFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return false;
    }

    try {
      // Process template file if provided
      let templateFileUrl = formData.template_file_url;
      let templateFileName = formData.template_file_name;
      
      if (formData.template_file instanceof File) {
        const templateFile = await uploadTemplateFile(formData.template_file);
        templateFileUrl = templateFile.url;
        templateFileName = templateFile.name;
      }
      
      // Set default value for email
      const templateData = {
        ...formData,
        canal: 'email', // Always set to email since it's the only option now
        user_id: user.id,
        status: formData.status || 'ativo', // Ensure status is set
        // Se não for definida uma assinatura custom, usar a das configurações (se disponível)
        signature_image: formData.signature_image || (settings?.signature_image || null),
        template_file_url: templateFileUrl || null,
        template_file_name: templateFileName || null
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
        signature_image: templateData.signature_image ? 'presente' : 'ausente',
        descricao: templateData.descricao || 'não definida',
        template_file_url: templateData.template_file_url ? 'presente' : 'ausente'
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
      // Process template file if provided
      let templateFileUrl = formData.template_file_url;
      let templateFileName = formData.template_file_name;
      
      if (formData.template_file instanceof File) {
        const templateFile = await uploadTemplateFile(formData.template_file);
        templateFileUrl = templateFile.url;
        templateFileName = templateFile.name;
      }
      
      // Always set to 'email' for backwards compatibility
      const templateData = {
        ...formData, 
        canal: 'email',
        status: formData.status || 'ativo', // Ensure status is set
        // Se não for definida uma assinatura custom, usar a das configurações (se disponível)
        signature_image: formData.signature_image || (settings?.signature_image || null),
        template_file_url: templateFileUrl || null,
        template_file_name: templateFileName || null
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
        signature_image: templateData.signature_image ? 'presente' : 'ausente',
        descricao: templateData.descricao || 'não definida',
        template_file_url: templateData.template_file_url ? 'presente' : 'ausente'
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
        descricao: template.descricao || '', // Include description field with fallback
        canal: template.canal || 'email',
        assinatura: template.assinatura,
        signature_image: template.signature_image,
        attachments: template.attachments || JSON.stringify([]),
        status: template.status || 'ativo', // Ensure the duplicated template has a status
        user_id: user?.id,
        // Use type assertion for template_file properties
        template_file_url: (template as any).template_file_url || null,
        template_file_name: (template as any).template_file_name || null
      };
      
      console.log('Duplicando template:', {
        nome: newTemplate.nome,
        status: newTemplate.status,
        attachments: newTemplate.attachments ? 'presente' : 'ausente',
        descricao: newTemplate.descricao || 'não definida',
        template_file_url: newTemplate.template_file_url ? 'presente' : 'ausente'
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
      console.log('Tentando excluir template:', id);
      
      // Check if the template exists first
      const { data: template, error: getError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) {
        console.error('Erro ao buscar template:', getError);
        throw getError;
      }
      
      // Update references in agendamentos table
      console.log('Atualizando agendamentos relacionados...');
      const { error: agendamentosError } = await supabase
        .from('agendamentos')
        .update({ template_id: null })
        .eq('template_id', id);
        
      if (agendamentosError) {
        console.error('Erro ao atualizar agendamentos:', agendamentosError);
        throw agendamentosError;
      }
      
      // Update references in envios table
      console.log('Atualizando envios relacionados...');
      const { error: enviosError } = await supabase
        .from('envios')
        .update({ template_id: null, status: 'template_deleted' })
        .eq('template_id', id);
        
      if (enviosError) {
        console.error('Erro ao atualizar envios:', enviosError);
        throw enviosError;
      }
      
      // Delete attachment files if they exist
      if (template && template.attachments) {
        try {
          // Parse attachments and handle string and object formats
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
          // Continue with deletion even if attachment cleanup fails
        }
      }
      
      // Delete template file if it exists
      const templateFileUrl = template?.template_file_url;
      if (templateFileUrl) {
        try {
          // Extract filename from URL
          const urlParts = templateFileUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user?.id}/${fileName}`;
          
          await supabase.storage
            .from('template_files')
            .remove([filePath]);
        } catch (e) {
          console.error('Erro ao excluir arquivo de template:', e);
          // Continue with deletion even if file cleanup fails
        }
      }
      
      // Finally delete the template
      console.log('Excluindo template...');
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro final ao excluir template:', error);
        throw error;
      }
      
      toast.success('Template excluído com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template: ' + (error.message || 'Falha na operação'));
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
