import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, X, SendHorizontal, Loader2, Check, Search, CheckCheck, Zap } from 'lucide-react';
import { useSchedules, ScheduleFormData } from '@/hooks/useSchedules';
import { useContacts } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { useBatchEmailSending } from '@/hooks/useBatchEmailSending';
import { useEnvios } from '@/hooks/useEnvios';
import { processBatch, getBatchSummary } from '@/utils/batchProcessing';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface ScheduleFormProps {
  onCancel: () => void;
  initialData?: ScheduleFormData & { id?: string };
  isEditing?: boolean;
  onSuccess?: () => void;
}

export function ScheduleForm({ onCancel, initialData, isEditing = false, onSuccess }: ScheduleFormProps) {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [optimizationEnabled, setOptimizationEnabled] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState<{minutes: number, hours: number} | null>(null);
  
  const { createSchedule, updateSchedule } = useSchedules();
  const { contacts, fetchContacts } = useContacts();
  const { templates, fetchTemplates } = useTemplates();
  const { sendBatchEmails, isProcessing, progress } = useBatchEmailSending();
  const { sendEmail } = useEnvios();

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);
  
  // Extract all unique tags from contacts
  useEffect(() => {
    const tags = contacts.reduce((allTags: string[], contact) => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => {
          if (!allTags.includes(tag)) {
            allTags.push(tag);
          }
        });
      }
      return allTags;
    }, []);
    
    setAvailableTags(tags);
  }, [contacts]);

  // Calculate estimated processing time for large volumes
  useEffect(() => {
    if (selectedContacts.length >= 100) {
      const avgTimePerEmail = 500; // 500ms per email average
      const totalMs = selectedContacts.length * avgTimePerEmail;
      const minutes = Math.round(totalMs / (1000 * 60));
      const hours = Math.round(minutes / 60 * 10) / 10;
      setEstimatedTime({ minutes, hours });
    } else {
      setEstimatedTime(null);
    }
  }, [selectedContacts.length]);

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

    // Warning for very large volumes
    if (selectedContacts.length >= 1000) {
      toast.warning(`⚠️ Volume alto detectado: ${selectedContacts.length} contatos. O processamento pode levar alguns minutos.`);
    }
    
    try {
      if (bulkMode && selectedContacts.length > 1) {
        // Enhanced bulk scheduling with optimizations for large volumes
        const results = await processBatch(
          selectedContacts,
          async (contactId) => {
            const singleFormData = {
              ...formData,
              contato_id: contactId
            };
            
            return isEditing && initialData?.id
              ? await updateSchedule(initialData.id, singleFormData)
              : await createSchedule(singleFormData);
          },
          {
            batchSize: selectedContacts.length >= 1000 ? 20 : selectedContacts.length >= 500 ? 15 : 10,
            delayBetweenBatches: selectedContacts.length >= 1000 ? 50 : selectedContacts.length >= 500 ? 100 : 200,
            showProgress: true,
            enableLargeVolumeOptimizations: selectedContacts.length >= 500
          }
        );
        
        const summary = getBatchSummary(results);
        
        if (summary.isFullSuccess) {
          toast.success(`🎉 Todos os ${summary.total} agendamentos criados com sucesso!`);
          onCancel();
          if (onSuccess) onSuccess();
        } else if (summary.successCount > 0) {
          toast.warning(`⚠️ ${summary.successCount} de ${summary.total} agendamentos criados (${summary.successRate}% sucesso).`);
          if (onSuccess) onSuccess();
        } else {
          toast.error("❌ Falha ao criar agendamentos");
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
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
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

    // Enhanced warning and confirmation for large volumes
    if (selectedContacts.length >= 1000) {
      const proceed = window.confirm(
        `Você está prestes a enviar ${selectedContacts.length} emails. ` +
        `Isto pode levar ${estimatedTime?.minutes || 'vários'} minutos. ` +
        `Deseja continuar?`
      );
      if (!proceed) return;
    }

    try {
      if (bulkMode && selectedContacts.length > 1) {
        // Use the ultra-optimized batch email sending
        const emailJobs = selectedContacts.map(contactId => {
          const contact = contacts.find(c => c.id === contactId);
          return {
            contactId,
            templateId: formData.template_id,
            contactName: contact?.nome
          };
        });

        // Show optimization info for large batches
        if (selectedContacts.length >= 500) {
          toast.info(`🚀 Modo ultra-otimizado ativado para ${selectedContacts.length} emails (ETA: ${estimatedTime?.minutes || '?'} min)`);
        }

        const result = await sendBatchEmails(emailJobs, {
          showProgress: true,
          enableOptimizations: optimizationEnabled
        });
        
        if (result.success) {
          onCancel();
          if (onSuccess) onSuccess();
        }
        
        return;
      }
      
      // Single send
      const selectedContact = contacts.find(c => c.id === selectedContacts[0]);
      
      toast.info(`Iniciando envio para ${selectedContact?.nome || 'contato selecionado'}...`);
      
      const result = await sendEmail({
        contato_id: selectedContacts[0],
        template_id: formData.template_id
      });
      
      if (result) {
        onCancel();
        if (onSuccess) onSuccess();
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

  const toggleBulkMode = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setBulkMode(isChecked);
    // When switching to single mode, keep only the first selection
    if (!isChecked && selectedContacts.length > 1) {
      setSelectedContacts([selectedContacts[0]]);
    }
  };
  
  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSelectAllContacts = () => {
    if (filteredContacts.length === 0) {
      toast.error("Nenhum contato disponível para seleção");
      return;
    }
    
    const allContactIds = filteredContacts.map(contact => contact.id);
    setSelectedContacts(allContactIds);
    setBulkMode(true); // Automatically enable bulk mode when selecting all
    toast.success(`${allContactIds.length} contatos selecionados`);
  };
  
  // Filter contacts based on search query and selected tags
  const filteredContacts = contacts.filter(contact => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      contact.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.telefone && contact.telefone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.razao_social && contact.razao_social.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // Tag filter
    const matchesTags = selectedTags.length === 0 || 
      (contact.tags && selectedTags.some(tag => contact.tags && contact.tags.includes(tag)));
      
    return matchesSearch && matchesTags;
  });

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const handleOptimizationToggle = (checked: boolean | "indeterminate") => {
    setOptimizationEnabled(checked === true);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <h3 className="text-lg font-semibold">{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="bulkMode" 
                checked={bulkMode} 
                onCheckedChange={toggleBulkMode}
              />
              <label htmlFor="bulkMode" className="text-sm font-medium">
                Selecionar múltiplos contatos
              </label>
            </div>
            
            {selectedContacts.length >= 50 && (
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <Checkbox 
                  id="optimizationEnabled" 
                  checked={optimizationEnabled} 
                  onCheckedChange={handleOptimizationToggle}
                />
                <label htmlFor="optimizationEnabled" className="text-sm font-medium text-orange-600">
                  Otimizações para lotes grandes
                </label>
              </div>
            )}
          </div>
          
          {/* Enhanced progress bar and performance metrics */}
          {isProcessing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Enviando emails...</span>
                <span>{progress.current}/{progress.total} ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="w-full" />
              {progress.total >= 500 && (
                <div className="text-xs text-muted-foreground">
                  ⚡ Modo otimizado ativo para volumes grandes
                </div>
              )}
            </div>
          )}

          {/* Large volume estimation display */}
          {estimatedTime && selectedContacts.length >= 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-800">
                  Volume estimado: {selectedContacts.length} emails
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Tempo estimado: ~{estimatedTime.minutes} minutos
                {selectedContacts.length >= 1000 && ` (${estimatedTime.hours}h)`}
              </div>
            </div>
          )}
          
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Tag selection */}
          {availableTags.length > 0 && (
            <div>
              <Label className="mb-2 block">Filtrar por tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <div 
                    key={tag} 
                    className={`px-2.5 py-0.5 rounded-full text-xs cursor-pointer ${
                      selectedTags.includes(tag) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => toggleTagSelection(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="contato">Contato{bulkMode ? 's' : ''}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllContacts}
                disabled={filteredContacts.length === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Selecionar todos os contatos
              </Button>
            </div>
            <ScrollArea className="h-40 border rounded-md p-2 mt-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center mb-2">
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactSelection(contact.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`contact-${contact.id}`} className="text-sm">
                      <span className="font-medium">{contact.nome}</span>
                      <span className="text-muted-foreground ml-2">({contact.email})</span>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.tags.map((tag, i) => (
                            <span 
                              key={i}
                              className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </label>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhum contato encontrado
                </div>
              )}
            </ScrollArea>
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
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSendNow}
              disabled={isProcessing || selectedContacts.length === 0 || !formData.template_id}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : selectedContacts.length >= 500 && optimizationEnabled ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : (
                <SendHorizontal className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? 'Processando...' : 
               selectedContacts.length >= 500 && optimizationEnabled ? 'Envio Ultra-otimizado' : 
               selectedContacts.length >= 100 ? 'Envio Otimizado' : 'Enviar Agora'}
            </Button>
            <Button 
              type="submit"
              disabled={isProcessing || selectedContacts.length === 0 || !formData.template_id}
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
