
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, ArrowLeft, Send, Eye } from 'lucide-react';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import { ImageUploader } from '@/components/templates/ImageUploader';
import { TemplateFileUpload } from '@/components/templates/TemplateFileUpload';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { FontSizeSelector } from '@/components/templates/FontSizeSelector';
import { VariableInserter } from '@/components/templates/VariableInserter';
import { Template, TemplateFormData } from '@/types/template';
import { TemplateFormProps } from './TemplateFormProps';
import { toast } from 'sonner';

export function TemplateForm({ template, isEditing, onSave, onCancel, onSendTest }: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    nome: '',
    conteudo: '',
    canal: 'email',
    assinatura: '',
    signature_image: null,
    status: 'ativo',
    attachments: [],
    descricao: '',
    template_file_url: null,
    template_file_name: null,
    template_file: null,
    image_url: null,
    font_size_px: '16px'
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (template && isEditing) {
      setFormData({
        nome: template.nome || '',
        conteudo: template.conteudo || '',
        canal: template.canal || 'email',
        assinatura: template.assinatura || '',
        signature_image: template.signature_image || null,
        status: template.status || 'ativo',
        attachments: template.attachments || [],
        descricao: template.descricao || '',
        template_file_url: template.template_file_url || null,
        template_file_name: template.template_file_name || null,
        template_file: null,
        image_url: template.image_url || null,
        font_size_px: template.font_size_px || '16px'
      });
    }
  }, [template, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome do template é obrigatório');
      return;
    }

    if (!formData.conteudo.trim()) {
      toast.error('Conteúdo do template é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (!success) {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      setIsSubmitting(false);
    }
  };

  const handleSendTest = async () => {
    if (!template?.id) {
      toast.error('Salve o template primeiro antes de enviar um teste');
      return;
    }

    setIsSendingTest(true);
    try {
      const success = await onSendTest(template.id);
      if (success) {
        toast.success('Email de teste enviado com sucesso!');
      } else {
        toast.error('Erro ao enviar email de teste');
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar email de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setFormData({ 
      ...formData, 
      conteudo: formData.conteudo + ' ' + variable 
    });
  };

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Preview do Template</h2>
          <Button onClick={() => setShowPreview(false)} variant="outline">
            Voltar ao Editor
          </Button>
        </div>
        <TemplatePreview
          template={{
            ...formData,
            id: template?.id || '',
            created_at: template?.created_at || '',
            user_id: template?.user_id || ''
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário Principal */}
      <div className="lg:col-span-2">
        <Card className="w-full">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{isEditing ? 'Editar Template' : 'Criar Novo Template'}</CardTitle>
                  <CardDescription>
                    {isEditing ? 'Edite as informações do seu template' : 'Preencha as informações para criar um novo template'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Button>
                  {isEditing && template && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSendTest}
                      disabled={isSendingTest}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSendingTest ? 'Enviando...' : 'Teste'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Template *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Email de Boas-vindas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Breve descrição do template (opcional)"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <FontSizeSelector
                value={formData.font_size_px || '16px'}
                onChange={(value) => setFormData({ ...formData, font_size_px: value })}
              />

              <VariableInserter onInsertVariable={handleInsertVariable} />

              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo do Template *</Label>
                <div className="space-y-2">
                  <RichTextEditor
                    value={formData.conteudo}
                    onChange={(value) => setFormData({ ...formData, conteudo: value })}
                    placeholder="Digite o conteúdo do seu template aqui..."
                    fontSize={formData.font_size_px}
                  />
                  <div className="text-xs text-muted-foreground">
                    Use as variáveis acima para personalizar o conteúdo
                  </div>
                </div>
              </div>

              <ImageUploader
                initialImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              />

              <TemplateFileUpload
                attachments={formData.attachments || []}
                onChange={(newAttachments) => setFormData({
                  ...formData,
                  attachments: newAttachments
                })}
                onFileUploaded={(fileUrl, fileName) => {
                  setFormData({
                    ...formData,
                    template_file_url: fileUrl,
                    template_file_name: fileName
                  });
                }}
              />

              <div className="space-y-2">
                <Label htmlFor="assinatura">Assinatura</Label>
                <Textarea
                  id="assinatura"
                  placeholder="Sua assinatura (opcional)"
                  value={formData.assinatura || ''}
                  onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={onCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Template' : 'Criar Template'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Preview Lateral */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview ao Vivo</CardTitle>
              <CardDescription>
                Visualização em tempo real do seu template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePreview
                template={{
                  ...formData,
                  id: template?.id || '',
                  created_at: template?.created_at || '',
                  user_id: template?.user_id || ''
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
