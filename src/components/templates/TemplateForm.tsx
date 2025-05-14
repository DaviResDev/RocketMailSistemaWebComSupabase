
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, Send, File as FileIcon, Loader2, X, Upload, PaperclipIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Template } from '@/types/template';

export interface TemplateFormProps {
  template?: Template;
  isEditing?: boolean;
  onSave: (formData: any) => Promise<boolean>;
  onCancel?: () => void;
  onSendTest?: (templateId: string) => Promise<boolean>;
}

export function TemplateForm({ template, isEditing = false, onSave, onCancel, onSendTest }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    canal: 'email',
    assinatura: 'sim',
    status: 'ativo'
  });
  
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedAttachments, setSavedAttachments] = useState<Array<{name: string, type: string, size: number, content?: string, url: string}>>([]);
  
  useEffect(() => {
    if (template) {
      setFormData({
        nome: template.nome || '',
        conteudo: template.conteudo || '',
        canal: template.canal || 'email',
        assinatura: template.assinatura || 'sim',
        status: template.status || 'ativo'
      });
      
      // Handle attachments if they exist
      if (template.attachments) {
        try {
          let attachmentsArray = [];
          
          if (typeof template.attachments === 'string') {
            // If it's a JSON string, parse it
            attachmentsArray = JSON.parse(template.attachments);
          } else if (Array.isArray(template.attachments)) {
            // If it's already an array, use it directly
            attachmentsArray = template.attachments;
          } else if (template.attachments && typeof template.attachments === 'object') {
            // If it's a single object, put it in an array
            attachmentsArray = [template.attachments];
          }
          
          if (Array.isArray(attachmentsArray)) {
            setSavedAttachments(attachmentsArray.map(att => ({
              name: att.filename || att.name,
              type: att.type || 'application/octet-stream',
              size: att.size || 0,
              url: att.url || '',
              content: att.content
            })));
          }
        } catch (e) {
          console.error('Error processing attachments:', e);
        }
      }
    }
  }, [template]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    
    try {
      // Process file attachments
      let processedAttachments = [];
      
      if (files.length > 0) {
        for (const file of files) {
          const reader = new FileReader();
          
          const fileContent = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          processedAttachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            content: fileContent
          });
        }
      }
      
      // Combine new attachments with saved ones that aren't being deleted
      const allAttachments = [
        ...savedAttachments,
        ...processedAttachments
      ];
      
      // Submit all data including attachments
      const submitData = {
        ...formData,
        attachments: allAttachments.length > 0 ? allAttachments : null
      };
      
      const success = await onSave(submitData);
      
      if (success) {
        if (isEditing) {
          toast({
            title: "Template atualizado",
            description: "O template foi atualizado com sucesso!"
          });
        } else {
          toast({
            title: "Template criado",
            description: "O novo template foi criado com sucesso!"
          });
          
          // Reset form after successful save if not editing
          setFormData({
            nome: '',
            conteudo: '',
            canal: 'email',
            assinatura: 'sim',
            status: 'ativo'
          });
          setFiles([]);
          setSavedAttachments([]);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao salvar template: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestSend = async () => {
    if (!template?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Salve o template antes de enviar um teste"
      });
      return;
    }
    
    setSending(true);
    
    try {
      if (onSendTest) {
        const success = await onSendTest(template.id);
        if (success) {
          toast({
            title: "Teste enviado",
            description: "O email de teste foi enviado com sucesso!"
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao enviar teste: ${error.message}`
      });
    } finally {
      setSending(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array and add to files state
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleRemoveSavedAttachment = (index: number) => {
    setSavedAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </h3>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Template</Label>
            <Input
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Ex: Newsletter Mensal"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="canal">Canal</Label>
            <Select
              value={formData.canal}
              onValueChange={(value) => handleSelectChange('canal', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Visualização</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  name="conteudo"
                  value={formData.conteudo}
                  onChange={handleChange}
                  placeholder="Digite o conteúdo do seu template aqui..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Use {'{nome}'} para incluir o nome do contato automaticamente.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="bg-white p-4 border rounded-md min-h-[300px]">
              <div 
                dangerouslySetInnerHTML={{
                  __html: formData.conteudo
                    .replace(/\n/g, '<br>')
                    .replace(/\{nome\}/g, '<span class="bg-yellow-100 px-1">Nome do Contato</span>')
                }}
              />
            </TabsContent>
          </Tabs>
          
          {formData.canal === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="assinatura">Incluir assinatura?</Label>
              <Select
                value={formData.assinatura}
                onValueChange={(value) => handleSelectChange('assinatura', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Incluir assinatura?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {formData.canal === 'email' && (
            <div className="space-y-2">
              <Label>Anexos</Label>
              <div className="border rounded-md p-4">
                {/* Input for file uploads */}
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Anexar Arquivo
                  </Button>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                  />
                  <p className="text-xs text-muted-foreground">
                    Anexe arquivos que serão enviados com este template
                  </p>
                </div>
                
                {/* List of files to upload */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Novos Arquivos:</p>
                    <ul className="space-y-2">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <div className="flex items-center">
                            <FileIcon className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* List of previously saved attachments */}
                {savedAttachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Arquivos Salvos:</p>
                    <ul className="space-y-2">
                      {savedAttachments.map((attachment, index) => (
                        <li key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <div className="flex items-center">
                            <FileIcon className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-sm">{attachment.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatFileSize(attachment.size)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSavedAttachment(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {files.length === 0 && savedAttachments.length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <PaperclipIcon className="h-8 w-8 mb-2 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum arquivo anexado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Arquivos anexados aqui serão enviados automaticamente com este template
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status do template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        
        <Separator />
        
        <CardFooter className="flex justify-between pt-4">
          <div className="flex space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={saving || sending}
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={saving || sending}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Atualizar Template' : 'Salvar Template'}
                </>
              )}
            </Button>
          </div>
          
          {isEditing && template?.id && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestSend}
              disabled={saving || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
