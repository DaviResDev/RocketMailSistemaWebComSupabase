
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Mail, Upload, File, Copy, SendIcon } from 'lucide-react';
import { TemplateFormData, useTemplates } from '@/hooks/useTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplateFormProps {
  formData: TemplateFormData;
  setFormData: (data: TemplateFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function TemplateForm({ formData, setFormData, onSubmit, onCancel, isEditing }: TemplateFormProps) {
  const [testEmail, setTestEmail] = useState('');
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{name: string, size: number, type: string}>>([]);
  const { user } = useAuth();
  const { sendTestEmail } = useTemplates();
  const [previewContent, setPreviewContent] = useState('');
  
  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
  const formattedTime = `${currentDate.toLocaleTimeString('pt-BR')}`;

  const acceptedFileTypes = "ics, xlsx, xls, ods, docx, doc, cs, pdf, txt, gif, jpg, jpeg, png, tif, tiff, rtf, msg, pub, mobi, ppt, pptx, eps";

  useEffect(() => {
    // Update preview when template content changes
    updatePreviewContent();
  }, [formData.conteudo, formData.assinatura]);

  const updatePreviewContent = () => {
    const templatedContent = (formData.conteudo || '')
      .replace(/{nome}/g, "João Silva")
      .replace(/{email}/g, "joao.silva@exemplo.com")
      .replace(/{telefone}/g, "(11) 99999-9999")
      .replace(/{cliente}/g, "Empresa Demo")
      .replace(/{razao_social}/g, "Empresa Demo Ltda.")
      .replace(/{dia}/g, formattedDate);
      
    const fullContent = formData.assinatura 
      ? templatedContent + "\n\n" + formData.assinatura
      : templatedContent;
      
    setPreviewContent(fullContent);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload de arquivos');
      return;
    }
    
    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const filePath = `${user.id}/${Date.now()}-${fileName}`;
        
        const { error } = await supabase.storage
          .from('template_attachments')
          .upload(filePath, file);
          
        if (error) {
          throw error;
        }
        
        setAttachments(prev => [...prev, {
          name: fileName,
          size: file.size,
          type: file.type
        }]);
      }
      
      toast.success('Arquivos anexados com sucesso!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDuplicateTemplate = () => {
    // Create a new template with the current form data but with a different name
    const duplicatedData = {
      ...formData,
      nome: `${formData.nome} (Cópia)`
    };
    setFormData(duplicatedData);
    toast.success('Template duplicado! Salve para confirmar.');
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Digite um e-mail para enviar o teste');
      return;
    }

    if (isEditing) {
      // For existing templates, we have the ID and can send a test
      await sendTestEmail(formData.id as string, testEmail);
    } else {
      toast.info('Salve o template primeiro antes de enviar o teste');
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Editar Template' : 'Novo Template'}
            </h3>
            {isEditing && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleDuplicateTemplate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <Label className="mb-2 block">Canal</Label>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 mr-1" />
                <span className="text-sm">Email</span>
              </div>
              <Input
                type="hidden"
                value="email"
                onChange={() => {}}
              />
            </div>
          </div>

          <Tabs defaultValue="editor">
            <TabsList className="mb-4">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Prévia</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="conteudo">Conteúdo</Label>
                    <Button 
                      type="button" 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => setShowTestEmail(!showTestEmail)}
                    >
                      {showTestEmail ? 'Ocultar' : 'Enviar e-mail de teste'}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Você pode usar as seguintes variáveis no conteúdo: {'{nome}'}, {'{email}'}, {'{telefone}'}, {'{razao_social}'}, {'{cliente}'}, {'{dia}'}
                  </div>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    className="min-h-[200px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="assinatura">Assinatura Digital</Label>
                  <Textarea
                    id="assinatura"
                    value={formData.assinatura || ''}
                    onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
                    className="min-h-[100px]"
                    placeholder="Exemplo: Atenciosamente, Equipe Disparo Pro"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <div className="border rounded-md p-4 min-h-[350px] whitespace-pre-wrap">
                <div className="mb-2 pb-2 border-b">
                  <div><strong>Assunto:</strong> {formData.nome}</div>
                  <div><strong>Para:</strong> joao.silva@exemplo.com</div>
                </div>
                {previewContent.split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Esta é uma prévia de como seu e-mail aparecerá para o destinatário. Variáveis substituídas:</p>
                <ul className="list-disc list-inside mt-1 grid grid-cols-2 gap-1">
                  <li>{"{nome}"} → João Silva</li>
                  <li>{"{email}"} → joao.silva@exemplo.com</li>
                  <li>{"{telefone}"} → (11) 99999-9999</li>
                  <li>{"{cliente}"} → Empresa Demo</li>
                  <li>{"{razao_social}"} → Empresa Demo Ltda.</li>
                  <li>{"{dia}"} → {formattedDate}</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
          
          <div>
            <Label className="block mb-2">Anexos</Label>
            <div className="border rounded p-3 space-y-4">
              <Input 
                type="file" 
                id="file-upload"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="text-xs text-muted-foreground">
                Tipos de arquivos aceitos: {acceptedFileTypes}
              </div>
              
              {uploading && (
                <div className="text-sm text-muted-foreground">
                  Fazendo upload...
                </div>
              )}
              
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <Label>Arquivos anexados:</Label>
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {showTestEmail && (
            <div className="p-4 border rounded bg-muted/50 space-y-2">
              <Label htmlFor="test-email">E-mail para teste</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="Digite um e-mail para enviar um teste"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={!isEditing}
                >
                  <SendIcon className="h-4 w-4 mr-2" />
                  Enviar teste
                </Button>
              </div>
              {!isEditing && (
                <p className="text-xs text-muted-foreground italic">
                  Salve o template primeiro para poder enviar um email de teste.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between space-x-2">
          <Button 
            variant="ghost" 
            type="button"
            onClick={onCancel}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit">
            {isEditing ? 'Atualizar' : 'Criar'} Template
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
