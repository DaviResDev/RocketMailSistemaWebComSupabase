
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import RichTextEditor from '@/components/templates/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TemplateFormProps } from './TemplateFormProps';
import { Template } from '@/types/template';
import { useSettings } from '@/hooks/useSettings';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignaturePreview } from '@/components/settings/SignaturePreview';
import { Send, FileText, Paperclip } from 'lucide-react';
import { TemplateFileUpload } from './TemplateFileUpload';

export function TemplateForm({ template, isEditing, onSave, onCancel, onSendTest }: TemplateFormProps) {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    status: 'ativo',
    signature_image: '',
    template_file_url: '',
    template_file_name: '',
  });
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasTemplateFile, setHasTemplateFile] = useState(false);
  
  // Initialize form data from template when editing
  useEffect(() => {
    if (template) {
      setFormData({
        nome: template.nome || '',
        descricao: template.descricao || '',
        conteudo: template.conteudo || '',
        status: template.status || 'ativo',
        signature_image: template.signature_image || (settings?.signature_image || ''),
        template_file_url: template.template_file_url || '',
        template_file_name: template.template_file_name || '',
      });
      
      setHasTemplateFile(!!template.template_file_url);
    } else {
      // Use the user's signature from settings by default for new templates
      setFormData(prevData => ({
        ...prevData,
        signature_image: settings?.signature_image || ''
      }));
    }
  }, [template, settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleEditorChange = (content: string) => {
    setFormData(prevData => ({
      ...prevData,
      conteudo: content
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prevData => ({
      ...prevData,
      status: value
    }));
  };

  const handleFileUploaded = (fileUrl: string, fileName: string) => {
    setFormData(prevData => ({
      ...prevData,
      template_file_url: fileUrl,
      template_file_name: fileName
    }));
    setHasTemplateFile(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Always ensure signature_image is included from settings if not specified
      const dataToSave = {
        ...formData,
        signature_image: formData.signature_image || settings?.signature_image || ''
      };
      
      const success = await onSave(dataToSave);
      if (!success) {
        throw new Error("Falha ao salvar o template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (template && onSendTest) {
      try {
        await onSendTest(template.id);
        setIsTestDialogOpen(false);
      } catch (error) {
        console.error("Error sending test:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Título do e-mail</Label>
            <Input 
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Ex: Boas-vindas, Confirmação de Pedido, etc."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (Assunto do e-mail)</Label>
            <Input 
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              placeholder="Ex: Bem-vindo à nossa plataforma"
            />
            <p className="text-sm text-muted-foreground">
              Esta descrição será usada como assunto do e-mail quando enviado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template File Upload Component */}
          <div className="border p-4 rounded-md bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Arquivo de Template</h3>
            </div>
            <TemplateFileUpload onFileUploaded={handleFileUploaded} />
            {hasTemplateFile && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Você pode usar o conteúdo do arquivo como template ou editar manualmente abaixo.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Conteúdo do e-mail</Label>
            <RichTextEditor 
              value={formData.conteudo}
              onChange={handleEditorChange}
              placeholder="Escreva o conteúdo do seu e-mail aqui..."
            />
            <p className="text-sm text-muted-foreground mt-1">
              Você pode usar marcadores como {'{nome}'}, {'{email}'}, etc. para personalizar o conteúdo.
            </p>
          </div>

          {/* Preview section */}
          <div className="mt-6">
            <Label className="mb-2 block">Prévia do e-mail com assinatura</Label>
            {settings && (
              <div className="border rounded-md overflow-hidden">
                <SignaturePreview 
                  settings={settings} 
                  emailContent={formData.conteudo}
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              A assinatura acima é definida nas configurações do seu perfil e será adicionada automaticamente aos emails enviados.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {isEditing && template && onSendTest && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsTestDialogOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Testar envio
              </Button>
            )}
            
            <Button 
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Test dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar e-mail de teste</DialogTitle>
          </DialogHeader>
          <p>
            Um e-mail de teste será enviado para o seu endereço cadastrado nas configurações.
            Deseja continuar?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTest}>
              Enviar teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
