import { useState, useEffect, useCallback } from 'react';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { useTemplates } from '@/hooks/useTemplates';
import { useVisualAlerts } from '@/hooks/useVisualAlerts';
import { AnimatedAlert } from '@/components/ui/animated-alert';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle, Search, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Template } from '@/types/template';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

const Templates = () => {
  const { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, sendTestEmail, duplicateTemplate } = useTemplates();
  const { alerts, showSuccess, showError, showInfo, removeAlert } = useVisualAlerts();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const loadTemplates = useCallback(async () => {
    if (user) {
      try {
        setErrorMessage(null);
        await fetchTemplates();
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Error loading templates:", err);
        setErrorMessage(err.message || "Falha na conexão com o servidor");
        setIsInitialized(true);
      }
    }
  }, [fetchTemplates, user]);

  useEffect(() => {
    if (!isInitialized && user) {
      loadTemplates();
    }
  }, [loadTemplates, retryCount, isInitialized, user]);

  const handleCreateClick = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleEditClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      console.log("Tentando excluir template com ID:", id);
      const success = await deleteTemplate(id);
      if (success) {
        showSuccess("Sucesso!", "Template excluído com sucesso!");
      }
      return success;
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      showError("Erro", "Erro ao excluir template");
      return false;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsInitialized(false);
  };

  const handleSendTest = async (templateId: string) => {
    if (!templateId) return false;
    
    const { data } = await supabase.auth.getUser();
    const testEmail = data?.user?.email;
    
    if (!testEmail) {
      showError("Erro", "Não foi possível obter seu email para envio de teste");
      return false;
    }
    
    showInfo("Enviando", `Email de teste sendo enviado para ${testEmail}`);
    
    try {
      const result = await sendTestEmail(templateId, testEmail);
      if (result) {
        showSuccess("Sucesso!", "Email de teste enviado com sucesso!");
      } else {
        showError("Erro", "Falha ao enviar email de teste");
      }
      return result;
    } catch (error) {
      console.error("Error sending test:", error);
      showError("Erro", "Erro inesperado ao enviar teste");
      return false;
    }
  };
  
  const filteredTemplates = templates.filter(template => 
    template.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-96">
          <p className="text-muted-foreground">Você precisa estar logado para ver os templates.</p>
        </div>
      </div>
    );
  }

  const TemplateSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-6 p-4 bg-muted rounded-md">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {/* Alertas Visuais */}
      {alerts.map((alert) => (
        <AnimatedAlert
          key={alert.id}
          type={alert.type}
          title={alert.title}
          description={alert.description}
          show={alert.show}
          onClose={() => removeAlert(alert.id)}
        />
      ))}

      <div className="container mx-auto py-6">
        {isCreating ? (
          <TemplateForm
            template={selectedTemplate || undefined}
            isEditing={isEditing}
            onSave={async (formData) => {
              try {
                if (isEditing && selectedTemplate) {
                  await updateTemplate(selectedTemplate.id, formData);
                  showSuccess("Sucesso!", "Template atualizado com sucesso!");
                } else {
                  await createTemplate(formData);
                  showSuccess("Sucesso!", "Template criado com sucesso!");
                }
                setIsCreating(false);
                setIsEditing(false);
                setSelectedTemplate(null);
                loadTemplates();
                return true;
              } catch (error) {
                console.error("Error saving template:", error);
                showError("Erro", "Falha ao salvar template");
                return false;
              }
            }}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedTemplate(null);
            }}
            onSendTest={handleSendTest}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Layout className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Templates</h1>
                  <p className="text-muted-foreground">Gerencie seus modelos de email</p>
                </div>
              </div>
              <Button onClick={handleCreateClick} className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Template
              </Button>
            </div>

            {loading && !isInitialized ? (
              <TemplateSkeletons />
            ) : errorMessage ? (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <p>Erro ao carregar templates: {errorMessage}</p>
                  <Button variant="outline" size="sm" onClick={handleRetry} className="w-fit">
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {templates.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Layout className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum template criado</h3>
                    <p className="text-muted-foreground mb-6">Crie seu primeiro template para começar a enviar emails personalizados.</p>
                    <Button onClick={handleCreateClick} className="flex items-center mx-auto">
                      <PlusCircle className="mr-2 h-4 w-4" /> Criar primeiro template
                    </Button>
                  </Card>
                ) : filteredTemplates.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">Nenhum template encontrado para "{searchTerm}".</p>
                    <Button variant="outline" onClick={() => setSearchTerm('')} className="mx-auto">
                      Limpar pesquisa
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={() => handleEditClick(template)}
                        onDelete={handleDeleteTemplate}
                        onDuplicate={() => {
                          duplicateTemplate(template.id);
                          showSuccess("Sucesso!", "Template duplicado com sucesso!");
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Templates;
