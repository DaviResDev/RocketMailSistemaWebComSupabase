
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

export function useTemplateEmail() {
  const { user } = useAuth();
  const { settings } = useSettings();

  // Função para processar as variáveis no conteúdo do template
  const processTemplateVariables = (content: string, testData: any = {}) => {
    // Obter dados atuais para variáveis de data e hora
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR');
    const formattedTime = currentDate.toLocaleTimeString('pt-BR');
    
    // Criar um objeto com todos os dados de substituição possíveis
    const replacements: Record<string, string> = {
      '{{nome}}': testData.nome || 'Usuário Teste',
      '{{email}}': testData.email || 'email@teste.com',
      '{{telefone}}': testData.telefone || '(00) 00000-0000',
      '{{razao_social}}': testData.razao_social || 'Empresa Teste',
      '{{cliente}}': testData.cliente || 'Cliente Teste',
      '{{empresa}}': testData.empresa || 'Empresa Teste',
      '{{cargo}}': testData.cargo || 'Cargo Teste',
      '{{produto}}': testData.produto || 'Produto Teste',
      '{{valor}}': testData.valor || 'R$ 1.000,00',
      '{{vencimento}}': testData.vencimento || '01/01/2025',
      '{{data}}': formattedDate,
      '{{hora}}': formattedTime
    };
    
    // Substituir todas as ocorrências das variáveis no conteúdo
    let processedContent = content;
    
    // Itera sobre cada chave no objeto de substituições
    Object.entries(replacements).forEach(([variable, value]) => {
      // Criar uma expressão regular para substituir todas as ocorrências da variável
      const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    return processedContent;
  };

  const sendTestEmail = async (templateId: string, email: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar emails de teste');
      return false;
    }

    try {
      const loadingToastId = toast.loading('Enviando email de teste...');
      
      // Get the template first
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      
      // Get user settings to include signature and SMTP settings
      const { data: userSettings, error: settingsError } = await supabase
        .from('configuracoes')
        .select('signature_image, email_usuario, email_smtp, email_porta, email_senha, smtp_nome, smtp_seguranca, use_smtp')
        .eq('user_id', user.id)
        .single();
        
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("Error fetching user settings:", settingsError);
      }
      
      // Process template content with test data for all variables
      const testData = {
        nome: "Usuário Teste",
        email: email,
        telefone: "(00) 00000-0000",
        razao_social: "Empresa Teste",
        cliente: "Cliente Teste",
        empresa: "Empresa Teste",
        cargo: "Cargo Teste",
        produto: "Produto Teste",
        valor: "R$ 1.000,00",
        vencimento: "01/01/2025"
      };
      
      // Processar todas as variáveis utilizando a função de processamento
      const processedContent = processTemplateVariables(template.conteudo, testData);
      
      // Parse attachments if present
      let parsedAttachments = [];
      if (template.attachments) {
        try {
          if (typeof template.attachments === 'string') {
            parsedAttachments = JSON.parse(template.attachments);
          } else if (Array.isArray(template.attachments)) {
            parsedAttachments = template.attachments;
          } else {
            parsedAttachments = [template.attachments];
          }
        } catch (error) {
          console.error('Erro ao processar anexos:', error);
        }
      }

      // Always use settings signature image if available, otherwise use template's
      const signatureImageToUse = settings?.signature_image || userSettings?.signature_image || template.signature_image;
      
      console.log("Using signature image:", signatureImageToUse);
      console.log("Attachments:", parsedAttachments);
      
      // Prepare SMTP settings if user has configured them
      const smtpSettings = userSettings?.use_smtp ? {
        host: userSettings.email_smtp,
        port: userSettings.email_porta,
        secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
        password: userSettings.email_senha,
        from_name: userSettings.smtp_nome || '',
        from_email: userSettings.email_usuario || ''
      } : null;
      
      // Call our send-email edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `[TESTE] ${template.nome}`,
          content: processedContent,
          isTest: true,
          signature_image: signatureImageToUse,
          attachments: parsedAttachments,
          image_url: template.image_url,
          // Include SMTP settings if using SMTP
          smtp_settings: smtpSettings,
          contato_nome: "Usuário Teste"
        },
      });
      
      toast.dismiss(loadingToastId);
      
      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(`Erro na função de envio: ${response.error.message || response.error}`);
      }
      
      // Check the response data
      const responseData = response.data;
      if (!responseData || !responseData.success) {
        console.error("Failed response from send-email:", responseData);
        throw new Error(responseData?.error || "Falha ao enviar email de teste");
      }
      
      toast.success(`Email de teste enviado para ${email}!`);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar email de teste:', error);
      toast.error('Erro ao enviar email de teste: ' + (error.message || 'Falha na conexão com o servidor'));
      return false;
    }
  };

  return {
    sendTestEmail,
    processTemplateVariables
  };
}
