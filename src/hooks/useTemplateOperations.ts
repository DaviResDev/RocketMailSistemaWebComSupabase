import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateFormData } from '@/types/template';
import { useTemplatesData } from '@/hooks/useTemplates/useTemplatesData';
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

  // Helper function to process attachments consistently - UPDATED to handle more files
  const processAttachments = async (attachments: any) => {
    if (!attachments) {
      return JSON.stringify([]);
    }

    // If it's already an array of processed attachments, convert to JSON
    if (Array.isArray(attachments)) {
      const processedAttachments = [];
      
      // Process up to 20 attachments (increased from previous limit)
      const maxFiles = Math.min(attachments.length, 20);
      
      for (let i = 0; i < maxFiles; i++) {
        const attachment = attachments[i];
        
        // If it's a File object, upload it to storage
        if (attachment instanceof File) {
          // Check file size - increased to 50MB per file
          if (attachment.size > 50 * 1024 * 1024) {
            toast.error(`Arquivo ${attachment.name} é muito grande. Tamanho máximo: 50MB`);
            continue;
          }
          
          const uploadedFile = await uploadFileToStorage(attachment);
          processedAttachments.push(uploadedFile);
        } 
        // If it's an object with file information, keep it
        else if (typeof attachment === 'object' && attachment !== null) {
          processedAttachments.push(attachment);
        }
      }
      
      if (attachments.length > 20) {
        toast.warning(`Apenas os primeiros 20 arquivos foram processados. ${attachments.length - 20} arquivos foram ignorados.`);
      }
      
      return JSON.stringify(processedAttachments);
    }
    
    // If it's a single File object, process and convert
    if (attachments instanceof File) {
      // Check file size
      if (attachments.size > 50 * 1024 * 1024) {
        toast.error(`Arquivo muito grande. Tamanho máximo: 50MB`);
        return JSON.stringify([]);
      }
      
      const uploadedFile = await uploadFileToStorage(attachments);
      return JSON.stringify([uploadedFile]);
    }
    
    // If it's already a JSON string, validate and return
    if (typeof attachments === 'string') {
      try {
        JSON.parse(attachments); // Verify it's valid JSON
        return attachments;
      } catch (e) {
        console.error('Invalid JSON in attachments:', e);
        return JSON.stringify([]);
      }
    }
    
    // For any other type, convert to empty array
    return JSON.stringify([]);
  };

  const createTemplate = async (formData: TemplateFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return false;
    }

    try {
      // Process attachments
      const processedAttachments = await processAttachments(formData.attachments);
      
      // Set default values for template data
      const templateData = {
        ...formData,
        canal: 'email', // Always set to email since it's the only option now
        user_id: user.id,
        status: formData.status || 'ativo', // Ensure status is set
        signature_image: settings?.signature_image || null, // Always use signature from settings
        image_url: formData.image_url || null, // Ensure image_url is included
        attachments: processedAttachments
      };
      
      console.log('Criando template com dados:', {
        ...templateData,
        attachments: processedAttachments ? 'presente' : 'ausente',
        signature_image: templateData.signature_image ? 'presente' : 'ausente',
        descricao: templateData.descricao || 'não definida',
        image_url: templateData.image_url ? 'presente' : 'ausente'
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
      // Process attachments
      const processedAttachments = await processAttachments(formData.attachments);
      
      // Always set to 'email' for backwards compatibility
      const templateData = {
        ...formData, 
        canal: 'email',
        status: formData.status || 'ativo', // Ensure status is set
        signature_image: settings?.signature_image || null, // Always use signature from settings
        image_url: formData.image_url || null, // Ensure image_url is included
        attachments: processedAttachments
      };
      
      console.log('Atualizando template com dados:', {
        ...templateData,
        attachments: processedAttachments ? 'presente' : 'ausente',
        signature_image: templateData.signature_image ? 'presente' : 'ausente',
        descricao: templateData.descricao || 'não definida',
        image_url: templateData.image_url ? 'presente' : 'ausente'
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
        descricao: template.descricao || '', 
        canal: template.canal || 'email',
        assinatura: template.assinatura,
        signature_image: template.signature_image,
        attachments: template.attachments || JSON.stringify([]),
        status: template.status || 'ativo',
        user_id: user?.id,
        image_url: template.image_url || null // Include image URL when duplicating
      };
      
      console.log('Duplicando template:', {
        nome: newTemplate.nome,
        status: newTemplate.status,
        attachments: newTemplate.attachments ? 'presente' : 'ausente',
        descricao: newTemplate.descricao || 'não definida',
        image_url: newTemplate.image_url ? 'presente' : 'ausente'
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
      // First, check if the template is being referenced in scheduled tasks
      const { data: agendamentos, error: checkError } = await supabase
        .from('agendamentos')
        .select('id, data_envio, contato:contatos(nome)')
        .eq('template_id', id);
        
      if (checkError) throw checkError;
      
      // If there are scheduled tasks using this template, prevent deletion
      if (agendamentos && agendamentos.length > 0) {
        // Format message to show which scheduled tasks are using the template
        const agendamentosInfo = agendamentos.map(ag => {
          const data = new Date(ag.data_envio).toLocaleDateString('pt-BR');
          const contatoNome = ag.contato?.nome || 'Contato desconhecido';
          return `- ${contatoNome} (agendado para ${data})`;
        }).join('\n');
        
        toast.error(`Não é possível excluir este template pois está sendo usado em agendamentos:\n${agendamentosInfo}\n\nCancele os agendamentos primeiro antes de excluir o template.`);
        return false;
      }
      
      // Check if it's being used in sent emails
      const { data: envios, error: enviosError } = await supabase
        .from('envios')
        .select('id, data_envio, contato_id')
        .eq('template_id', id);
        
      if (enviosError) throw enviosError;
      
      // Handle dependencies by updating sent emails to mark the template as deleted
      if (envios && envios.length > 0) {
        // Instead of preventing deletion, update the status of sent emails
        const { error: updateError } = await supabase
          .from('envios')
          .update({ status: 'template_deleted' })
          .eq('template_id', id);
          
        if (updateError) throw updateError;
      }
      
      // Get the template to access its attachments before deletion
      const { data: template, error: getError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) throw getError;
      
      // Delete attached files from storage, if they exist
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
        }
      }
      
      // Delete template file if it exists
      const templateFileUrl = (template as any).template_file_url;
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
        }
      }
      
      // Delete template image if it exists
      const templateImageUrl = (template as any).image_url;
      if (templateImageUrl) {
        try {
          // Extract filename from URL
          const urlParts = templateImageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const userId = user?.id;
          const filePath = `${userId}/${fileName}`;
          
          await supabase.storage
            .from('template-images')
            .remove([filePath]);
        } catch (e) {
          console.error('Erro ao excluir imagem do template:', e);
          // Continue with deletion even if file cleanup fails
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
