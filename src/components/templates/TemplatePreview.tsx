
import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Template } from '@/types/template';
import { useSettings } from '@/hooks/useSettings';
import { useEmailSignature } from '@/hooks/useEmailSignature';

interface TemplatePreviewProps {
  template: Partial<Template>;
}

export const TemplatePreview = ({ template }: TemplatePreviewProps) => {
  const { settings } = useSettings();
  const { getSignatureUrl } = useEmailSignature();
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  
  // Add Google Fonts for preview consistency
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&display=swap';
    
    if (!document.querySelector(`link[href="${fontLink.href}"]`)) {
      document.head.appendChild(fontLink);
    }
  }, []);
  
  // Load signature image on component mount and when settings change
  useEffect(() => {
    const loadSignatureImage = async () => {
      // Always prioritize the current settings signature image
      if (settings?.signature_image) {
        console.log("Using signature from current settings:", settings.signature_image);
        setSignatureImage(settings.signature_image);
        return;
      }
      
      // Try to fetch from Supabase if not available in current settings
      const signatureUrl = await getSignatureUrl();
      if (signatureUrl) {
        console.log("Using signature from Supabase:", signatureUrl);
        setSignatureImage(signatureUrl);
      } else {
        console.log("No signature image available");
        setSignatureImage(null);
      }
    };
    
    loadSignatureImage();
  }, [settings, getSignatureUrl]);
  
  // Memoized content processing for better performance
  const processedContent = useMemo(() => {
    const content = template.conteudo || '';
    return content
      .replace(/\{\{nome\}\}/g, "Nome do Cliente")
      .replace(/\{\{email\}\}/g, "cliente@exemplo.com")
      .replace(/\{\{telefone\}\}/g, "(00) 00000-0000")
      .replace(/\{\{razao_social\}\}/g, "Empresa Exemplo")
      .replace(/\{\{cliente\}\}/g, "Cliente Exemplo")
      .replace(/\{\{empresa\}\}/g, "Empresa Exemplo")
      .replace(/\{\{cargo\}\}/g, "Cargo Exemplo")
      .replace(/\{\{produto\}\}/g, "Produto Exemplo")
      .replace(/\{\{valor\}\}/g, "R$ 1.000,00")
      .replace(/\{\{vencimento\}\}/g, "01/01/2025")
      .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString('pt-BR'));
  }, [template.conteudo]);
  
  // Memoized attachments parsing
  const attachmentsList = useMemo(() => {
    if (!template.attachments) return [];
    
    try {
      let parsedAttachments = [];
      
      if (typeof template.attachments === 'string') {
        parsedAttachments = JSON.parse(template.attachments);
      } else if (Array.isArray(template.attachments)) {
        parsedAttachments = template.attachments;
      }
      
      return Array.isArray(parsedAttachments) ? parsedAttachments : [];
    } catch (e) {
      console.error('Erro ao processar anexos na preview:', e);
      return [];
    }
  }, [template.attachments]);
  
  // Render attachments component
  const renderAttachments = () => {
    if (attachmentsList.length === 0) return null;
    
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-2 text-foreground">Anexos ({attachmentsList.length}):</h4>
        <ul className="space-y-1">
          {attachmentsList.map((attachment: any, index: number) => (
            <li key={index} className="flex items-center text-sm text-muted-foreground">
              <span className="inline-flex items-center">
                📎 {attachment.name || attachment.file_name || 'Arquivo'}
                {attachment.size && ` (${(attachment.size / 1024).toFixed(1)} KB)`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b border-border pb-2 text-foreground">
          {template.nome || 'Preview do Template'}
        </h3>
        
        {/* Display description if present */}
        {template.descricao && (
          <div className="text-sm text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-3 my-2">
            {template.descricao}
          </div>
        )}
        
        {/* Display image at the top if present */}
        {template.image_url && (
          <div className="mb-4">
            <img 
              src={template.image_url} 
              alt="Imagem do template" 
              className="max-w-full h-auto rounded-md border"
              onError={(e) => {
                console.error("Error loading template image:", e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Main content with proper font rendering and explicit styles */}
        <div 
          className="prose max-w-none template-preview-content text-foreground"
          dir="ltr"
          style={{ 
            direction: 'ltr', 
            textAlign: 'left',
            fontFamily: 'inherit',
            lineHeight: '1.6'
          }}
          dangerouslySetInnerHTML={{ 
            __html: processedContent || '<p class="text-muted-foreground italic">Sem conteúdo</p>'
          }} 
        />
        
        {/* Display attachments if present */}
        {renderAttachments()}
        
        {/* Display signature if present - Always at the end */}
        {signatureImage && (
          <div className="pt-4 border-t border-border mt-6">
            <p className="text-sm text-muted-foreground mb-2">Assinatura:</p>
            <img 
              src={signatureImage} 
              alt="Assinatura" 
              className="max-h-24 border rounded" 
              style={{ maxWidth: '100%' }}
              onError={(e) => {
                console.error("Error loading signature image:", e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                setSignatureImage(null);
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
};
