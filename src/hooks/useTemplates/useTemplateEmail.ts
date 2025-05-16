
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useTemplateEmail() {
  const { user } = useAuth();

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
        
      // Parse attachments if they exist
      let attachmentsData = null;
      if (template.attachments) {
        if (typeof template.attachments === 'string' && template.attachments !== '[]') {
          try {
            attachmentsData = JSON.parse(template.attachments);
          } catch (err) {
            console.error('Erro ao analisar anexos:', err);
            // Continue without attachments
          }
        } else if (Array.isArray(template.attachments) && template.attachments.length > 0) {
          attachmentsData = template.attachments;
        }
      }
      
      // Call our send-email edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: template.descricao ? template.descricao : `[TESTE] ${template.nome}`,
          content: processedContent,
          isTest: true,
          signature_image: template.signature_image,
          attachments: attachmentsData,
          template_name: template.nome
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

  return { sendTestEmail };
}
