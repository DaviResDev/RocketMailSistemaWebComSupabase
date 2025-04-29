
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Mail, MessageSquare, Send } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplates';
import { useState } from 'react';
import { toast } from 'sonner';

interface TemplateFormProps {
  formData: TemplateFormData;
  setFormData: (data: TemplateFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function TemplateForm({ formData, setFormData, onSubmit, onCancel, isEditing }: TemplateFormProps) {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestEmail, setShowTestEmail] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData({ ...formData, conteudo: content });
      };
      reader.readAsText(file);
    }
  };
  
  const acceptedFileTypes = ".ics,.xlsx,.xls,.ods,.docx,.doc,.cs,.pdf,.txt,.gif,.jpg,.jpeg,.png,.tif,.tiff,.rtf,.msg,.pub,.mobi,.ppt,.pptx,.eps";

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast.error('Por favor, informe um email para envio do teste.');
      return;
    }

    setIsSendingTest(true);
    // Simulação de envio de teste
    setTimeout(() => {
      toast.success(`Email de teste enviado para ${testEmail}!`);
      setIsSendingTest(false);
      setShowTestEmail(false);
      setTestEmail('');
    }, 1500);
  };

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium mb-1">
              Nome do Template
            </label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Template de Boas-vindas"
              required
            />
          </div>
          <div>
            <label htmlFor="canal" className="block text-sm font-medium mb-1">
              Canal
            </label>
            <Select
              value={formData.canal}
              onValueChange={(value) => setFormData({ ...formData, canal: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </div>
                </SelectItem>
                <SelectItem value="ambos">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ambos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="conteudo" className="block text-sm font-medium mb-1">
              Conteúdo
            </label>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2 p-3 bg-muted rounded-md">
                <p>Variáveis disponíveis:</p>
                <ul className="list-disc list-inside mt-1">
                  <li><code>{"{nome}"}</code> - Nome do contato</li>
                  <li><code>{"{email}"}</code> - Email do contato</li>
                  <li><code>{"{telefone}"}</code> - Telefone do contato</li>
                  <li><code>{"{cliente}"}</code> - Nome do cliente</li>
                  <li><code>{"{razao_social}"}</code> - Razão social</li>
                  <li><code>{"{data}"}</code> - Data atual</li>
                  <li><code>{"{hora}"}</code> - Hora atual</li>
                </ul>
              </div>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Digite o conteúdo do seu template... Ex: Olá {nome}, tudo bem?"
                className="min-h-[200px]"
                required
              />
              <div className="flex justify-between">
                <Input
                  type="file"
                  accept={acceptedFileTypes}
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar arquivo
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  Tipos de Arquivos Aceitos: ics, xlsx, xls, ods, docx, doc, cs, pdf, txt, gif, jpg, jpeg, png, tif, tiff, rtf, msg, pub, mobi, ppt, pptx, eps
                </div>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="assinatura" className="block text-sm font-medium mb-1">
              Assinatura Digital
            </label>
            <Textarea
              id="assinatura"
              value={formData.assinatura || ''}
              onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
              placeholder="Adicione sua assinatura digital aqui..."
              className="h-[100px]"
            />
          </div>
          
          {!showTestEmail ? (
            <div className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowTestEmail(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar email de teste
              </Button>
            </div>
          ) : (
            <div className="flex space-x-2 pt-2">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Email para teste"
                type="email"
                className="flex-grow"
              />
              <Button 
                type="button" 
                onClick={handleSendTestEmail} 
                disabled={isSendingTest}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSendingTest ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowTestEmail(false)}
              >
                <X className="w-4 h-4" />
              </Button>
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
