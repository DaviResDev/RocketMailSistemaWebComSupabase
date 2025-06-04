
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

export function useTemplateEmail() {
  const { user } = useAuth();
  const { settings } = useSettings();

  // Função para processar as variáveis no conteúdo do template - reescrita para garantir processamento seguro
  const processTemplateVariables = (content: string, testData: any = {}) => {
    // Se não houver conteúdo, retornar string vazia para evitar erros
    if (!content) return '';
    
    let processedContent = content;

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
    
    // Também suportar variáveis no formato {nome} para compatibilidade
    const legacyReplacements: Record<string, string> = {
      '{nome}': testData.nome || 'Usuário Teste',
      '{email}': testData.email || 'email@teste.com',
      '{telefone}': testData.telefone || '(00) 00000-0000',
      '{razao_social}': testData.razao_social || 'Empresa Teste',
      '{cliente}': testData.cliente || 'Cliente Teste',
      '{empresa}': testData.empresa || 'Empresa Teste',
      '{cargo}': testData.cargo || 'Cargo Teste',
      '{produto}': testData.produto || 'Produto Teste',
      '{valor}': testData.valor || 'R$ 1.000,00',
      '{vencimento}': testData.vencimento || '01/01/2025',
      '{data}': formattedDate,
      '{hora}': formattedTime
    };
    
    // Primeiro substituir o formato moderno {{nome}} sem operações que possam inverter o texto
    Object.entries(replacements).forEach(([variable, value]) => {
      const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    // Depois substituir o formato legado {nome} sem operações que possam inverter o texto
    Object.entries(legacyReplacements).forEach(([variable, value]) => {
      const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    // Forçar a direção do texto para LTR
    processedContent = processedContent
      .replace(/dir\s*=\s*["']rtl["']/gi, 'dir="ltr"')
      .replace(/direction\s*:\s*rtl/gi, 'direction: ltr');
    
    // Se não encontrar nenhum atributo dir, adicionar dir="ltr" ao body
    if (!processedContent.includes('dir=')) {
      processedContent = processedContent.replace(/<body/i, '<body dir="ltr"');
    }
    
    // Adicionar style global para garantir que todos os elementos tenham direção LTR
    if (!processedContent.includes('<style id="email-direction-style">')) {
      const styleTag = `
        <style id="email-direction-style">
          * { direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important; }
        </style>
      `;
      
      if (processedContent.includes('<head>')) {
        processedContent = processedContent.replace('<head>', `<head>${styleTag}`);
      } else {
        processedContent = processedContent.replace(/<body/i, `$&${styleTag}`);
      }
    }
    
    return processedContent;
  };

  const sendTestEmail = async (templateId: string, email: string) => {
    // Email sending functionality has been removed
    console.log("Email sending functionality has been disabled");
    toast.error('Funcionalidade de envio de email foi removida do sistema. Use apenas para visualizar templates.');
    return false;
  };

  return {
    sendTestEmail,
    processTemplateVariables
  };
}
