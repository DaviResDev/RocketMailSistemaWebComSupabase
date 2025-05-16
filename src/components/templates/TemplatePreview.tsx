
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Template } from '@/types/template';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TemplatePreviewProps {
  template: Partial<Template>;
  showHeader?: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, showHeader = true }) => {
  // Prepare sample data for preview
  const previewData = {
    nome: 'João Silva',
    email: 'joao@exemplo.com',
    telefone: '(11) 99999-9999',
    razao_social: 'Empresa Exemplo Ltda',
    cliente: 'Cliente Exemplo',
    dia: new Date().toLocaleDateString('pt-BR')
  };

  // Process template content with sample data
  const processContent = (content: string) => {
    if (!content) return '';
    
    return content
      .replace(/{nome}/g, previewData.nome)
      .replace(/{email}/g, previewData.email)
      .replace(/{telefone}/g, previewData.telefone)
      .replace(/{razao_social}/g, previewData.razao_social)
      .replace(/{cliente}/g, previewData.cliente)
      .replace(/{dia}/g, previewData.dia);
  };

  const processedContent = processContent(template.conteudo || '');

  return (
    <Tabs defaultValue="preview" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="preview">Visualização</TabsTrigger>
        <TabsTrigger value="code">HTML</TabsTrigger>
      </TabsList>
      
      <TabsContent value="preview" className="mt-0">
        <Card className="border shadow-sm">
          {showHeader && (
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{template.nome || 'Visualização do Template'}</CardTitle>
            </CardHeader>
          )}
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
            
            {template.signature_image && (
              <div className="mt-4 border-t pt-4">
                <img 
                  src={template.signature_image} 
                  alt="Assinatura Digital" 
                  className="max-h-24"
                />
              </div>
            )}
            
            {template.attachments && (
              <div className="mt-4 text-sm text-muted-foreground">
                {template.attachments !== '[]' && (
                  <p>📎 Template contém anexos que serão enviados com o email</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="code" className="mt-0">
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[500px] text-xs">
              <code>{processedContent}</code>
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
