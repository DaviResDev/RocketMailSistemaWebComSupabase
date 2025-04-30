import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, X, SendHorizontal, Loader2, Check } from 'lucide-react';
import { useSchedules, ScheduleFormData } from '@/hooks/useSchedules';
import { useContacts } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { useEnvios } from '@/hooks/useEnvios';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface ScheduleFormProps {
  onCancel: () => void;
  initialData?: ScheduleFormData & { id?: string };
  isEditing?: boolean;
}

export function ScheduleForm({ onCancel, initialData, isEditing = false }: ScheduleFormProps) {
  const [formData, setFormData] = useState<ScheduleFormData>(
    initialData || {
      contato_id: '',
      template_id: '',
      data_envio: new Date().toISOString().slice(0, 16)
    }
  );
  
  const [selectedContacts, setSelectedContacts] = useState<string[]>(
    initialData?.contato_id ? [initialData.contato_id] : []
  );
  
  const [bulkMode, setBulkMode] = useState(false);

  const { createSchedule, updateSchedule } = useSchedules();
  const { contacts, fetchContacts } = useContacts();
  const { templates, fetchTemplates } = useTemplates();
  const { createEnvio, sending } = useEnvios();

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.template_id) {
      toast.error("Selecione um template para agendar");
      return;
    }
    
    if (selectedContacts.length === 0) {
      toast.error("Selecione pelo menos um contato para agendar");
      return;
    }
    
    // Bulk scheduling
    if (bulkMode && selectedContacts.length > 1) {
      let successCount = 0;
      const totalCount = selectedContacts.length;
      
      for (const contactId of selectedContacts) {
        const singleFormData = {
          ...formData,
          contato_id: contactId
        };
        
        const success = isEditing && initialData?.id
          ? await updateSchedule(initialData.id, singleFormData)
          : await createSchedule(singleFormData);
          
        if (success) successCount++;
      }
      
      if (successCount === totalCount) {
        toast.success(`${totalCount} agendamentos criados com sucesso!`);
        onCancel();
      } else {
        toast.warning(`${successCount} de ${totalCount} agendamentos foram criados com sucesso.`);
      }
      
      return;
    }
    
    // Single scheduling
    const singleFormData = {
      ...formData,
      contato_id: selectedContacts[0]
    };
    
    const success = isEditing && initialData?.id
      ? await updateSchedule(initialData.id, singleFormData)
      : await createSchedule(singleFormData);
      
    if (success) {
      onCancel();
    }
  };

  const handleSendNow = async () => {
    if (!formData.template_id) {
      toast.error("Selecione um template para enviar agora");
      return;
    }
    
    if (selectedContacts.length === 0) {
      toast.error("Selecione pelo menos um contato para enviar agora");
      return;
    }

    try {
      if (bulkMode && selectedContacts.length > 1) {
        let successCount = 0;
        const totalCount = selectedContacts.length;
        
        toast.info(
          `Iniciando envio para ${totalCount} contatos...`,
          { duration: 3000 }
        );
        
        for (const contactId of selectedContacts) {
          const result = await createEnvio({
            contato_id: contactId,
            template_id: formData.template_id
          });
          
          if (result) successCount++;
        }
        
        if (successCount === totalCount) {
          toast.success(`Mensagens enviadas com sucesso para todos os ${totalCount} contatos!`);
          onCancel();
        } else {
          toast.warning(`${successCount} de ${totalCount} mensagens foram enviadas com sucesso.`);
        }
        
        return;
      }
      
      // Single send
      const selectedContact = contacts.find(c => c.id === selectedContacts[0]);
      const selectedTemplate = templates.find(t => t.id === formData.template_id);
      
      toast.info(
        `Iniciando envio para ${selectedContact?.nome || 'contato selecionado'}...`,
        { duration: 3000 }
      );
      
      const result = await createEnvio({
        contato_id: selectedContacts[0],
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

  const handleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        if (!bulkMode) {
          // In single mode, replace the selection
          return [contactId];
        }
        // In bulk mode, add to selection
        return [...prev, contactId];
      }
    });
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    // When switching to single mode, keep only the first selection
    if (bulkMode && selectedContacts.length > 1) {
      setSelectedContacts([selectedContacts[0]]);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <h3 className="text-lg font-semibold">{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="bulkMode" 
              checked={bulkMode} 
              onCheckedChange={toggleBulkMode}
            />
            <label
              htmlFor="bulkMode"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Selecionar múltiplos contatos
            </label>
          </div>

          <div>
            <Label htmlFor="contato">Contato{bulkMode ? 's' : ''}</Label>
            <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center mb-2">
                  <Checkbox
                    id={`contact-${contact.id}`}
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={() => handleContactSelection(contact.id)}
                    className="mr-2"
                  />
                  <label htmlFor={`contact-${contact.id}`}>
                    {contact.nome} ({contact.email})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="template">Template</Label>
            <Select 
              value={formData.template_id} 
              onValueChange={(value) => setFormData({ ...formData, template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center">
                      {template.canal === 'email' ? (
                        <Mail className="w-4 h-4 mr-2" />
                      ) : template.canal === 'whatsapp' ? (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      ) : template.canal === 'ambos' ? (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          <MessageSquare className="w-4 h-4 mr-2" />
                        </>
                      ) : null}
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
              disabled={sending || selectedContacts.length === 0 || !formData.template_id}
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
              disabled={sending || selectedContacts.length === 0 || !formData.template_id}
            >
              {isEditing ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Atualizar
                </>
              ) : (
                'Criar Agendamento'
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
