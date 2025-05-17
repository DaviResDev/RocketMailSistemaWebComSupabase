
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

export function useTemplateEmail() {
  const { user } = useAuth();
  const { settings } = useSettings();

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
      const formattedTime = `${currentDate.toLocaleTimeString('pt-BR')}`;
      
      // Make sure to replace variables in the proper order
      let processedContent = template.conteudo
        .replace(/\{\{nome\}\}/g, "Usuário Teste")
        .replace(/\{\{email\}\}/g, email)
        .replace(/\{\{telefone\}\}/g, "(00) 00000-0000")
        .replace(/\{\{razao_social\}\}/g, "Empresa Teste")
        .replace(/\{\{cliente\}\}/g, "Cliente Teste")
        .replace(/\{\{empresa\}\}/g, "Empresa Teste")
        .replace(/\{\{cargo\}\}/g, "Cargo Teste")
        .replace(/\{\{produto\}\}/g, "Produto Teste")
        .replace(/\{\{valor\}\}/g, "R$ 1.000,00")
        .replace(/\{\{vencimento\}\}/g, "01/01/2025")
        .replace(/\{\{data\}\}/g, formattedDate)
        .replace(/\{\{hora\}\}/g, formattedTime);
        
      // Parse attachments if present
      let attachments = [];
      if (template.attachments) {
        try {
          if (typeof template.attachments === 'string') {
            attachments = JSON.parse(template.attachments);
          } else if (Array.isArray(template.attachments)) {
            attachments = template.attachments;
          }
        } catch (error) {
          console.error('Erro ao processar anexos:', error);
        }
      }
      
      // Call our send-email edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `[TESTE] ${template.nome}`,
          content: processedContent,
          isTest: true,
          signature_image: settings?.signature_image || template.signature_image,
          attachments: attachments,
          image_url: template.image_url
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
    sendTestEmail
  };
}
