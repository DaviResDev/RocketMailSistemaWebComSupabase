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

/**
 * Enhanced email validation function
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Handle both formats: "Name <email@domain.com>" and "email@domain.com"
  const emailRegex = /^(?:"?([^"]*)"?\s*<([^>]+)>|([^<>\s]+))$/;
  const match = email.match(emailRegex);
  
  if (!match) return false;
  
  // Extract the actual email address
  const actualEmail = match[2] || match[3];
  if (!actualEmail) return false;
  
  // Validate the email format
  const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validEmailRegex.test(actualEmail.trim());
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
  const [parallelSendingEnabled, setParallelSendingEnabled] = useState(true);
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

  // Calculate estimated processing time for large volumes - updated for ultra-parallel
  useEffect(() => {
    if (selectedContacts.length >= 100) {
      // Drastically improved estimation for ultra-parallel sending
      const avgTimePerEmail = parallelSendingEnabled && selectedContacts.length <= 30000 
        ? selectedContacts.length >= 10000 ? 50 : 100 // Ultra-fast for large volumes
        : 500; // Traditional sequential estimation
      
      const totalMs = selectedContacts.length * avgTimePerEmail;
      const minutes = Math.round(totalMs / (1000 * 60));
      const hours = Math.round(minutes / 60 * 10) / 10;
      setEstimatedTime({ minutes, hours });
    } else {
      setEstimatedTime(null);
    }
  }, [selectedContacts.length, parallelSendingEnabled]);

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

    // Enhanced warning for ultra-large volumes
    if (selectedContacts.length >= 10000) {
      toast.warning(`⚡ Volume ultra-alto detectado: ${selectedContacts.length.toLocaleString()} contatos. Processamento ultra-paralelo será usado.`);
    } else if (selectedContacts.length >= 1000) {
      toast.warning(`⚠️ Volume alto detectado: ${selectedContacts.length.toLocaleString()} contatos. O processamento pode levar alguns minutos.`);
    }
    
    try {
      if (bulkMode && selectedContacts.length > 1) {
        // Ultra-enhanced bulk scheduling with optimizations for very large volumes
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
            batchSize: selectedContacts.length >= 10000 ? 50 : selectedContacts.length >= 1000 ? 20 : 10,
            delayBetweenBatches: selectedContacts.length >= 10000 ? 25 : selectedContacts.length >= 1000 ? 50 : 100,
            showProgress: true,
            enableLargeVolumeOptimizations: selectedContacts.length >= 500
          }
        );
        
        const summary = getBatchSummary(results);
        
        if (summary.isFullSuccess) {
          toast.success(`🎉 Todos os ${summary.total.toLocaleString()} agendamentos criados com sucesso!`, {
            action: {
              label: "✕",
              onClick: () => {}
            }
          });
          onCancel();
          if (onSuccess) onSuccess();
        } else if (summary.successCount > 0) {
          toast.warning(`⚠️ ${summary.successCount.toLocaleString()} de ${summary.total.toLocaleString()} agendamentos criados (${summary.successRate}% sucesso).`, {
            action: {
              label: "✕",
              onClick: () => {}
            }
          });
          if (onSuccess) onSuccess();
        } else {
          toast.error("❌ Falha ao criar agendamentos", {
            action: {
              label: "✕",
              onClick: () => {}
            }
          });
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

    // Validate that selected contacts have valid emails
    const contactsWithValidEmails = selectedContacts.filter(contactId => {
      const contact = contacts.find(c => c.id === contactId);
      return contact && contact.email && isValidEmail(contact.email);
    });

    if (contactsWithValidEmails.length === 0) {
      toast.error("Nenhum contato selecionado possui email válido");
      return;
    }

    if (contactsWithValidEmails.length !== selectedContacts.length) {
      const invalidCount = selectedContacts.length - contactsWithValidEmails.length;
      toast.warning(`${invalidCount} contatos com emails inválidos serão ignorados`);
    }

    // Ultra-enhanced confirmation for large volumes with ultra-parallel info
    if (contactsWithValidEmails.length >= 10000) {
      const sendingMethod = parallelSendingEnabled ? "ultra-paralelo (simultâneo)" : "sequencial";
      const estimatedTimeText = parallelSendingEnabled 
        ? `pouquíssimos segundos` 
        : `${estimatedTime?.minutes || 'muitos'} minutos`;
      
      const proceed = window.confirm(
        `Você está prestes a enviar ${contactsWithValidEmails.length.toLocaleString()} emails de forma ${sendingMethod}. ` +
        `Isto deve levar ${estimatedTimeText}. ` +
        `Deseja continuar?`
      );
      if (!proceed) return;
    } else if (contactsWithValidEmails.length >= 1000) {
      const sendingMethod = parallelSendingEnabled ? "simultâneo" : "sequencial";
      const estimatedTimeText = parallelSendingEnabled 
        ? `poucos segundos` 
        : `${estimatedTime?.minutes || 'vários'} minutos`;
      
      const proceed = window.confirm(
        `Você está prestes a enviar ${contactsWithValidEmails.length.toLocaleString()} emails de forma ${sendingMethod}. ` +
        `Isto deve levar ${estimatedTimeText}. ` +
        `Deseja continuar?`
      );
      if (!proceed) return;
    }

    try {
      if (bulkMode && contactsWithValidEmails.length > 1) {
        // Create email jobs with enhanced validation
        const emailJobs = contactsWithValidEmails.map(contactId => {
          const contact = contacts.find(c => c.id === contactId);
          if (!contact || !contact.email) {
            console.warn(`Contato não encontrado ou sem email: ${contactId}`);
            return null;
          }
          
          return {
            contactId,
            templateId: formData.template_id,
            contactName: contact.nome,
            contactEmail: contact.email
          };
        }).filter(job => job !== null); // Remove null entries

        if (emailJobs.length === 0) {
          toast.error("Nenhum job de email válido foi criado");
          return;
        }

        console.log(`Criados ${emailJobs.length} jobs de email válidos para envio`);

        // Ultra-enhanced info for parallel sending
        if (emailJobs.length >= 10000 && parallelSendingEnabled) {
          toast.info(`⚡ Enviando ${emailJobs.length.toLocaleString()} emails simultaneamente (modo ultra-paralelo)...`);
        } else if (emailJobs.length >= 1000 && parallelSendingEnabled) {
          toast.info(`🚀 Enviando ${emailJobs.length.toLocaleString()} emails simultaneamente...`);
        } else if (emailJobs.length >= 500) {
          toast.info(`🚀 Modo ultra-otimizado ativado para ${emailJobs.length.toLocaleString()} emails`);
        }

        const result = await sendBatchEmails(emailJobs, {
          showProgress: true,
          enableOptimizations: !parallelSendingEnabled,
          useParallelSending: parallelSendingEnabled
        });
        
        if (result.success) {
          onCancel();
          if (onSuccess) onSuccess();
        }
        
        return;
      }
      
      // Single send
      const selectedContact = contacts.find(c => c.id === contactsWithValidEmails[0]);
      
      if (!selectedContact || !selectedContact.email) {
        toast.error("Contato selecionado não possui email válido");
        return;
      }

      toast.info(`Iniciando envio para ${selectedContact.nome}...`);
      
      const result = await sendEmail({
        contato_id: contactsWithValidEmails[0],
        template_id: formData.template_id
      });
      
      if (result) {
        onCancel();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Erro durante o envio:", error);
      toast.error(`Erro ao enviar mensagem: ${error.message || 'Erro desconhecido'}`, {
        action: {
          label: "✕",
          onClick: () => {}
        }
      });
    }
  };

  const handleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        if (!bulkMode) {
          return [contactId];
        }
        return [...prev, contactId];
      }
    });
  };

  const toggleBulkMode = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setBulkMode(isChecked);
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
    
    // Filter contacts that have valid emails
    const contactsWithEmails = filteredContacts.filter(contact => 
      contact.email && isValidEmail(contact.email)
    );
    
    if (contactsWithEmails.length === 0) {
      toast.error("Nenhum contato com email válido encontrado");
      return;
    }
    
    const allContactIds = contactsWithEmails.map(contact => contact.id);
    setSelectedContacts(allContactIds);
    setBulkMode(true);
    
    if (contactsWithEmails.length !== filteredContacts.length) {
      const invalidCount = filteredContacts.length - contactsWithEmails.length;
      toast.warning(`${allContactIds.length.toLocaleString()} contatos com emails válidos selecionados. ${invalidCount} contatos sem emails válidos foram ignorados.`);
    } else {
      toast.success(`${allContactIds.length.toLocaleString()} contatos selecionados`);
    }
  };
  
  // Filter contacts based on search query and selected tags
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === '' || 
      contact.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.telefone && contact.telefone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.razao_social && contact.razao_social.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTags = selectedTags.length === 0 || 
      (contact.tags && selectedTags.some(tag => contact.tags && contact.tags.includes(tag)));
      
    return matchesSearch && matchesTags;
  });

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const handleParallelSendingToggle = (checked: boolean | "indeterminate") => {
    setParallelSendingEnabled(checked === true);
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
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <Checkbox 
                    id="parallelSendingEnabled" 
                    checked={parallelSendingEnabled} 
                    onCheckedChange={handleParallelSendingToggle}
                  />
                  <label htmlFor="parallelSendingEnabled" className="text-sm font-medium text-blue-600">
                    {selectedContacts.length >= 10000 ? 'Envio ultra-paralelo' : 'Envio simultâneo (paralelo)'}
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Ultra-enhanced progress bar with ultra-parallel processing indicator */}
          {isProcessing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {parallelSendingEnabled && selectedContacts.length >= 10000
                    ? 'Enviando emails em modo ultra-paralelo...' 
                    : parallelSendingEnabled && selectedContacts.length <= 30000 
                    ? 'Enviando emails simultaneamente...' 
                    : 'Enviando emails...'}
                </span>
                <span>{progress.current.toLocaleString()}/{progress.total.toLocaleString()} ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="w-full" />
              {parallelSendingEnabled && selectedContacts.length >= 10000 && (
                <div className="text-xs text-blue-600">
                  ⚡ Processamento ultra-paralelo ativo - Velocidade máxima
                </div>
              )}
              {parallelSendingEnabled && selectedContacts.length <= 30000 && selectedContacts.length < 10000 && (
                <div className="text-xs text-blue-600">
                  ⚡ Processamento paralelo ativo - Alta velocidade
                </div>
              )}
              {progress.total >= 500 && !parallelSendingEnabled && (
                <div className="text-xs text-muted-foreground">
                  ⚡ Modo otimizado ativo para volumes grandes
                </div>
              )}
            </div>
          )}

          {/* Ultra-enhanced volume estimation with ultra-parallel sending info */}
          {estimatedTime && selectedContacts.length >= 100 && (
            <div className={`border rounded-md p-3 ${
              parallelSendingEnabled && selectedContacts.length >= 10000 
                ? 'bg-green-50 border-green-200' 
                : parallelSendingEnabled 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Zap className={`h-4 w-4 ${
                  parallelSendingEnabled && selectedContacts.length >= 10000
                    ? 'text-green-500'
                    : parallelSendingEnabled 
                    ? 'text-blue-500' 
                    : 'text-orange-500'
                }`} />
                <span className={`text-sm font-medium ${
                  parallelSendingEnabled && selectedContacts.length >= 10000
                    ? 'text-green-800'
                    : parallelSendingEnabled 
                    ? 'text-blue-800' 
                    : 'text-orange-800'
                }`}>
                  Volume estimado: {selectedContacts.length.toLocaleString()} emails
                  {parallelSendingEnabled && selectedContacts.length >= 10000
                    ? ' (Ultra-paralelo)'
                    : parallelSendingEnabled 
                    ? ' (Simultâneo)' 
                    : ' (Sequencial)'}
                </span>
              </div>
              <div className={`text-xs mt-1 ${
                parallelSendingEnabled && selectedContacts.length >= 10000
                  ? 'text-green-600'
                  : parallelSendingEnabled 
                  ? 'text-blue-600' 
                  : 'text-orange-600'
              }`}>
                Tempo estimado: {
                  parallelSendingEnabled && selectedContacts.length >= 10000
                    ? '~pouquíssimos segundos'
                    : parallelSendingEnabled 
                    ? '~poucos segundos' 
                    : `~${estimatedTime.minutes} minutos`
                }
                {selectedContacts.length >= 1000 && !parallelSendingEnabled && ` (${estimatedTime.hours}h)`}
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
                filteredContacts.map((contact) => {
                  const hasValidEmail = contact.email && isValidEmail(contact.email);
                  return (
                    <div key={contact.id} className="flex items-center mb-2">
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleContactSelection(contact.id)}
                        className="mr-2"
                        disabled={!hasValidEmail}
                      />
                      <label htmlFor={`contact-${contact.id}`} className={`text-sm ${!hasValidEmail ? 'opacity-50' : ''}`}>
                        <span className="font-medium">{contact.nome}</span>
                        <span className="text-muted-foreground ml-2">
                          ({contact.email || 'sem email'})
                          {!hasValidEmail && contact.email && <span className="text-red-500"> - email inválido</span>}
                          {!contact.email && <span className="text-red-500"> - sem email</span>}
                        </span>
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
                  );
                })
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
              ) : parallelSendingEnabled && selectedContacts.length >= 10000 ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : parallelSendingEnabled && selectedContacts.length >= 50 ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : selectedContacts.length >= 500 ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : (
                <SendHorizontal className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? 'Processando...' : 
               parallelSendingEnabled && selectedContacts.length >= 10000 ? 'Envio Ultra-paralelo' :
               parallelSendingEnabled && selectedContacts.length >= 50 ? 'Envio Simultâneo' :
               selectedContacts.length >= 500 ? 'Envio Ultra-otimizado' : 
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
