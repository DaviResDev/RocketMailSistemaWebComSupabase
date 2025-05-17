
import React from 'react';
import { Card } from '@/components/ui/card';
import { Template } from '@/types/template';
import { useSettings } from '@/hooks/useSettings';

interface TemplatePreviewProps {
  template: Partial<Template>;
}

export const TemplatePreview = ({ template }: TemplatePreviewProps) => {
  const { settings } = useSettings();
  
  // Replace template variables with sample values
  const processContent = (content: string) => {
    return content
      .replace(/{nome}/g, "Nome do Cliente")
      .replace(/{email}/g, "cliente@exemplo.com")
      .replace(/{telefone}/g, "(00) 00000-0000")
      .replace(/{razao_social}/g, "Empresa Exemplo")
      .replace(/{cliente}/g, "Cliente Exemplo")
      .replace(/{dia}/g, new Date().toLocaleDateString('pt-BR'));
  };
  
  const getSignatureImage = () => {
    // If template has a specific signature image, use it
    if (template.signature_image && template.signature_image !== 'no_signature') {
      // If it's the default signature, use the one from settings
      if (template.signature_image === 'default_signature') {
        return settings?.signature_image || null;
      }
      return template.signature_image;
    }
    return null;
  };
  
  const signatureImage = getSignatureImage();
  
  // Function to create full preview content
  const createPreviewContent = () => {
    let fullContent = '';
    
    // Always add main content
    fullContent += template.conteudo ? processContent(template.conteudo) : '<p>Sem conteúdo</p>';
    
    return fullContent;
  };
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b pb-2">{template.nome || 'Preview do Template'}</h3>
        
        {/* Display image at the top if present */}
        {template.image_url && (
          <div className="mb-4">
            <img 
              src={template.image_url} 
              alt="Imagem do template" 
              className="max-w-full h-auto rounded-md"
            />
          </div>
        )}
        
        {/* Main content */}
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: createPreviewContent()
          }} 
        />
        
        {/* Display signature if present - Always at the end */}
        {signatureImage && (
          <div className="pt-4 border-t mt-6">
            <p className="text-sm text-muted-foreground mb-2">Assinatura:</p>
            <img 
              src={signatureImage} 
              alt="Assinatura" 
              className="max-h-24" 
              style={{ maxWidth: '100%' }}
            />
          </div>
        )}
      </div>
    </Card>
  );
};
