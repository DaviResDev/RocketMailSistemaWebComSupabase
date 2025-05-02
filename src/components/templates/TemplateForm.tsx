
import { useState, useEffect, KeyboardEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Eye, AlertCircle, User, Mail, Building, Phone, Calendar, FileText } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplates';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  
  // Test data for preview
  const previewData = {
    nome: 'Cliente Teste',
    email: 'cliente@teste.com',
    telefone: '(11) 99999-9999',
    razao_social: 'Empresa Teste LTDA',
    cliente: 'Cliente Corporativo Teste',
    dia: new Date().toLocaleDateString('pt-BR'),
  };
  
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
    let signature = '';
    if (formData.assinatura) {
      signature = `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><div style="font-size: 0.9em; color: #666;">${formData.assinatura.replace(/\n/g, '<br>')}</div>`;
    }
    
    setPreviewHTML(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div>${htmlContent}</div>
        ${signature}
      </div>
    `);
  }, [formData.conteudo, formData.assinatura]);

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
                <Label htmlFor="assinatura">Assinatura (opcional)</Label>
                <Textarea
                  id="assinatura"
                  placeholder="Ex: Atenciosamente, Equipe de Marketing"
                  rows={3}
                  value={formData.assinatura || ''}
                  onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
                />
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
