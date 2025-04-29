
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, X, SendHorizontal, Loader2 } from 'lucide-react';
import { useSchedules, ScheduleFormData } from '@/hooks/useSchedules';
import { useContacts } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { useEnvios } from '@/hooks/useEnvios';
import { toast } from 'sonner';

interface ScheduleFormProps {
  onCancel: () => void;
  initialData?: ScheduleFormData & { id?: string };
}

export function ScheduleForm({ onCancel, initialData }: ScheduleFormProps) {
  const [formData, setFormData] = useState<ScheduleFormData>(
    initialData || {
      contato_id: '',
      template_id: '',
      data_envio: new Date().toISOString().slice(0, 16)
    }
  );

  const { createSchedule } = useSchedules();
  const { contacts, fetchContacts } = useContacts();
  const { templates, fetchTemplates } = useTemplates();
  const { createEnvio, sending } = useEnvios();

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contato_id || !formData.template_id) {
      toast.error("Selecione um contato e um template para agendar");
      return;
    }
    
    const success = await createSchedule(formData);
    if (success) {
      onCancel();
    }
  };

  const handleSendNow = async () => {
    if (!formData.contato_id || !formData.template_id) {
      toast.error("Selecione um contato e um template para enviar agora");
      return;
    }

    try {
      const selectedContact = contacts.find(c => c.id === formData.contato_id);
      const selectedTemplate = templates.find(t => t.id === formData.template_id);
      
      toast.info(
        `Iniciando envio para ${selectedContact?.nome || 'contato selecionado'}...`,
        { duration: 3000 }
      );
      
      const result = await createEnvio({
        contato_id: formData.contato_id,
        template_id: formData.template_id
      });
      
      if (result) {
        onCancel();
      }
    } catch (error: any) {
      console.error("Erro durante o envio:", error);
      toast.error(`Erro ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const getSelectedContactName = () => {
    const contact = contacts.find(c => c.id === formData.contato_id);
    return contact ? `${contact.nome}${contact.email ? ` (${contact.email})` : ''}` : 'Selecione um contato';
  };

  const getSelectedTemplateName = () => {
    const template = templates.find(t => t.id === formData.template_id);
    return template ? template.nome : 'Selecione um template';
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <h3 className="text-lg font-semibold">Novo Agendamento</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contato">Contato</Label>
            <Select 
              value={formData.contato_id} 
              onValueChange={(value) => setFormData({ ...formData, contato_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contato">
                  {getSelectedContactName()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.nome} ({contact.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="template">Template</Label>
            <Select 
              value={formData.template_id} 
              onValueChange={(value) => setFormData({ ...formData, template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template">
                  {getSelectedTemplateName()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center">
                      {template.canal === 'email' ? (
                        <Mail className="w-4 h-4 mr-2" />
                      ) : template.canal === 'whatsapp' ? (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          <MessageSquare className="w-4 h-4 mr-2" />
                        </>
                      )}
                      {template.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="data_envio">Data de Envio</Label>
            <Input
              id="data_envio"
              type="datetime-local"
              value={formData.data_envio}
              onChange={(e) => setFormData({ ...formData, data_envio: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between space-x-2">
          <Button 
            variant="ghost" 
            type="button"
            onClick={onCancel}
            disabled={sending}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSendNow}
              disabled={sending || !formData.contato_id || !formData.template_id}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="mr-2 h-4 w-4" />
              )}
              {sending ? 'Enviando...' : 'Enviar Agora'}
            </Button>
            <Button 
              type="submit"
              disabled={sending || !formData.contato_id || !formData.template_id}
            >
              Criar Agendamento
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
