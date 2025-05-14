import { useState, useEffect, KeyboardEventHandler, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Eye, AlertCircle, User, Mail, Building, Phone, Calendar, FileText, Upload, File } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplates';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateFormProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

export function TemplateForm({ formData, setFormData, onSubmit, onCancel, isEditing }: TemplateFormProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewHTML, setPreviewHTML] = useState('');
  const [signature, setSignature] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  
  // Test data for preview
  const previewData = {
    nome: 'Cliente Teste',
    email: 'cliente@teste.com',
    telefone: '(11) 99999-9999',
    razao_social: 'Empresa Teste LTDA',
    cliente: 'Cliente Corporativo Teste',
    dia: new Date().toLocaleDateString('pt-BR'),
  };

  // Load existing attachments and signature when editing
  useEffect(() => {
    if (isEditing) {
      try {
        // Processar os anexos existentes quando estiver editando
        if (formData.attachments) {
          let attachmentsList = [];
          
          if (typeof formData.attachments === 'string') {
            try {
              attachmentsList = JSON.parse(formData.attachments);
            } catch (e) {
              console.error('Erro ao analisar anexos como string JSON:', e);
            }
          } else if (Array.isArray(formData.attachments)) {
            attachmentsList = formData.attachments;
          }
          
          // Atualizar a interface com os anexos existentes
          if (Array.isArray(attachmentsList) && attachmentsList.length > 0) {
            // Criar "arquivos" para exibição na interface
            const displayFiles = attachmentsList.map((attachment, index) => {
              // Fix: Create File objects correctly with proper parameters
              const blob = new Blob(['placeholder'], { type: 'application/octet-stream' });
              const fileName = attachment.name || `anexo-${index + 1}.pdf`;
              return new File([blob], fileName, { type: 'application/octet-stream' });
            });
            
            setAttachments(displayFiles);
            console.log('Anexos carregados do template:', attachmentsList.length);
          }
        }
          
        // Se temos uma assinatura, definir a visualização
        if (formData.signature_image) {
          setSignaturePreview(formData.signature_image);
          console.log('Assinatura carregada do template');
        }
      } catch (error) {
        console.error("Erro ao processar dados existentes do template:", error);
      }
    }
  }, [isEditing, formData.attachments, formData.signature_image]);
  
  // Update preview when template content changes
  useEffect(() => {
    const processedContent = formData.conteudo
      .replace(/{nome}/g, previewData.nome)
      .replace(/{email}/g, previewData.email)
      .replace(/{telefone}/g, previewData.telefone)
      .replace(/{razao_social}/g, previewData.razao_social)
      .replace(/{cliente}/g, previewData.cliente)
      .replace(/{dia}/g, previewData.dia);
      
    // Convert plain text with line breaks to HTML
    const htmlContent = processedContent.replace(/\n/g, '<br>');
    
    // Generate signature if it exists
    let signatureHtml = '';
    if (formData.assinatura) {
      signatureHtml = `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><div style="font-size: 0.9em; color: #666;">${formData.assinatura.replace(/\n/g, '<br>')}</div>`;
    }
    
    // Add signature image if available
    if (signaturePreview) {
      signatureHtml += `<div style="margin-top: 10px;"><img src="${signaturePreview}" style="max-height: 60px;" alt="Assinatura digital" /></div>`;
    }
    
    // Add attachment list if available
    let attachmentsHtml = '';
    if (attachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ddd;">
          <p style="font-size: 0.9em; color: #666;">Anexos (${attachments.length}):</p>
          <ul style="font-size: 0.85em; color: #777;">
            ${attachments.map(file => `<li>${file.name} (${(file.size / 1024).toFixed(1)} KB)</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    setPreviewHTML(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div>${htmlContent}</div>
        ${signatureHtml}
        ${attachmentsHtml}
      </div>
    `);
  }, [formData.conteudo, formData.assinatura, signaturePreview, attachments]);

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      conteudo: prev.conteudo + variable
    }));
  };

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newContent = formData.conteudo.substring(0, start) + '  ' + formData.conteudo.substring(end);
      setFormData({
        ...formData,
        conteudo: newContent
      });
      
      // Move cursor after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.includes('image/')) {
        toast.error('Por favor, faça upload de uma imagem para sua assinatura.');
        return;
      }
      
      // Max 2MB
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem não pode ser maior que 2MB.');
        return;
      }
      
      setSignature(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      if (!user) {
        toast.error('Você precisa estar logado para fazer upload de arquivos.');
        return;
      }
      
      // First check if signatures bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const signaturesBucketExists = buckets?.some(bucket => bucket.name === 'signatures');
      
      if (!signaturesBucketExists) {
        await supabase.storage.createBucket('signatures', {
          public: true
        });
        console.log('Created signatures bucket');
      }
      
      // Upload file to Supabase Storage
      const fileName = `signature_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(`${user.id}/${fileName}`, file);
        
      if (uploadError) {
        console.error('Error uploading signature:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(`${user.id}/${fileName}`);
        
      if (publicUrlData && publicUrlData.publicUrl) {
        // Set the signature image URL in form data
        setFormData(prev => ({
          ...prev,
          signature_image: publicUrlData.publicUrl
        }));
        
        toast.success('Assinatura digital adicionada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da assinatura:', error);
      toast.error(`Erro ao fazer upload da assinatura: ${error.message}`);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const files = Array.from(e.target.files);
      console.log(`Processando ${files.length} anexos para upload`);
      
      // Max 10MB per file
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`O arquivo ${file.name} excede o limite de 10MB.`);
          return;
        }
      }
      
      if (!user) {
        toast.error('Você precisa estar logado para fazer upload de arquivos.');
        return;
      }
      
      // First check if attachments bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const attachmentsBucketExists = buckets?.some(bucket => bucket.name === 'attachments');
      
      if (!attachmentsBucketExists) {
        await supabase.storage.createBucket('attachments', {
          public: true
        });
        console.log('Created attachments bucket');
      }
      
      // Array to store attachment metadata
      const attachmentsList = [];
      
      // Upload files to Supabase Storage
      for (const file of files) {
        const fileName = `attachment_${Date.now()}_${file.name}`;
        console.log(`Fazendo upload do arquivo: ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(`${user.id}/${fileName}`, file);
          
        if (uploadError) {
          console.error(`Error uploading attachment ${file.name}:`, uploadError);
          toast.error(`Erro ao fazer upload do anexo ${file.name}: ${uploadError.message}`);
          continue;
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(`${user.id}/${fileName}`);
          
        if (publicUrlData && publicUrlData.publicUrl) {
          // Add file metadata to attachments list
          attachmentsList.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrlData.publicUrl
          });
          
          console.log(`Anexo ${file.name} salvo com sucesso`);
        }
      }
      
      // Add files to attachments list in UI
      setAttachments(prev => [...prev, ...files]);
      
      // Update form data with attachment metadata
      const currentAttachments = typeof formData.attachments === 'string'
        ? JSON.parse(formData.attachments || '[]')
        : (formData.attachments || []);
      
      const updatedAttachments = [...currentAttachments, ...attachmentsList];
      
      // Sempre guardar attachments como string JSON para consistência
      setFormData(prev => ({
        ...prev,
        attachments: JSON.stringify(updatedAttachments)
      }));
      
      console.log(`${attachmentsList.length} arquivos anexados e salvos no formData`);
      toast.success(`${files.length} arquivo(s) anexado(s)`);
      
    } catch (error: any) {
      console.error('Erro ao anexar arquivos:', error);
      toast.error(`Erro ao anexar arquivos: ${error.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Create a file reader to read the file content
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result;
        if (typeof fileContent === 'string') {
          const fileObj = {
            name: file.name,
            type: file.type,
            size: file.size,
            content: fileContent.split(',')[1], // Extract base64 content
            url: fileContent // Full data URL
          };
          
          setAttachments(prev => [...prev, fileObj]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    // Remove from UI display
    setAttachments(prev => prev.filter((_, i) => i !== index));
    
    // Remove from form data
    setFormData(prev => {
      const currentAttachments = typeof prev.attachments === 'string'
        ? JSON.parse(prev.attachments || '[]')
        : (prev.attachments || []);
        
      const updatedAttachments = currentAttachments.filter((_: any, i: number) => i !== index);
      
      // Sempre guardar attachments como string JSON para consistência
      return {
        ...prev,
        attachments: JSON.stringify(updatedAttachments)
      };
    });
    
    console.log(`Anexo removido no índice ${index}`);
  };

  const removeSignature = () => {
    setSignature(null);
    setSignaturePreview(null);
    
    // Remove signature from form data
    setFormData(prev => ({
      ...prev,
      signature_image: null
    }));
  };

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Atualize o template existente.' : 'Crie um novo template para enviar aos seus contatos.'}
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="edit" className="flex-1">Editar</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Visualizar</TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="p-6">
            <TabsContent value="edit" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Template</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Boas-vindas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="conteudo">Conteúdo</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Inserir Variável
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" side="top">
                        <div className="grid gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{nome}')}
                          >
                            <User className="mr-2 h-4 w-4" /> Nome
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{email}')}
                          >
                            <Mail className="mr-2 h-4 w-4" /> Email
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{telefone}')}
                          >
                            <Phone className="mr-2 h-4 w-4" /> Telefone
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{razao_social}')}
                          >
                            <Building className="mr-2 h-4 w-4" /> Razão Social
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{cliente}')}
                          >
                            <FileText className="mr-2 h-4 w-4" /> Cliente
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => insertVariable('{dia}')}
                          >
                            <Calendar className="mr-2 h-4 w-4" /> Data Atual
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Textarea
                  id="conteudo"
                  placeholder="Digite o conteúdo do seu template aqui..."
                  rows={12}
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  onKeyDown={handleKeyDown}
                  required
                  className="font-mono text-sm"
                />
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" /> Use {'{nome}'}, {'{email}'}, {'{telefone}'}, etc. para 
                  incluir dados do contato no seu template.
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="assinatura">Assinatura (opcional)</Label>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      ref={signatureInputRef}
                      onChange={handleSignatureUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => signatureInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Assinatura Digital
                    </Button>
                  </div>
                </div>
                
                {signaturePreview && (
                  <div className="mb-4 flex items-center">
                    <img 
                      src={signaturePreview} 
                      alt="Assinatura Preview" 
                      className="max-h-16 border rounded p-1 mr-2"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={removeSignature}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <Textarea
                  id="assinatura"
                  placeholder="Ex: Atenciosamente, Equipe RocketMail"
                  rows={3}
                  value={formData.assinatura || ''}
                  onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Anexos</Label>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef}
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <File className="mr-2 h-4 w-4" />
                    Adicionar Anexos
                  </Button>
                </div>
                
                {/* Attachment list */}
                {attachments.length > 0 && (
                  <div className="border rounded-md p-3 mt-2">
                    <p className="text-sm font-medium mb-2">Anexos ({attachments.length})</p>
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-1.5 bg-muted/50 rounded">
                          <div className="flex items-center">
                            <File className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <span>{file.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Canal de envio</h4>
                <Badge>Email</Badge>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Prévia do Email</CardTitle>
                  <CardDescription>
                    Como o destinatário verá seu email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border rounded-md p-4 overflow-auto max-h-[400px]" 
                    dangerouslySetInnerHTML={{ __html: previewHTML }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </CardContent>
        </Tabs>
        
        <CardFooter className="flex justify-between space-x-2">
          <Button variant="ghost" type="button" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
            >
              <Eye className="mr-2 h-4 w-4" />
              {activeTab === 'edit' ? 'Visualizar' : 'Editar'}
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Atualizar Template' : 'Salvar Template'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
