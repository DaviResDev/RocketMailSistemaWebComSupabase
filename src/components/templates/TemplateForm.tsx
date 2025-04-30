
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Mail, MessageSquare } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplates';

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
            <RadioGroup
              value={formData.canal}
              onValueChange={(value) => setFormData({ ...formData, canal: value })}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ambos" id="ambos" />
                <Label htmlFor="ambos" className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Ambos
                </Label>
              </div>
            </RadioGroup>
          </div>

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
                <Button type="button">
                  Enviar teste
                </Button>
              </div>
            </div>
          )}
          
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
