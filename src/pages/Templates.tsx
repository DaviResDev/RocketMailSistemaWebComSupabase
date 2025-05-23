
import { useState, useEffect, useCallback } from 'react';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle, Search } from 'lucide-react';
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
        toast.success("Template excluído com sucesso!");
      }
      return success;
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      toast.error("Erro ao excluir template");
      return false;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsInitialized(false);
  };

  // Wrap the sendTestEmail function to ensure correct parameters
  const handleSendTest = async (templateId: string) => {
    if (!templateId) return false;
    
    // Get user email for test
    const { data } = await supabase.auth.getUser();
    const testEmail = data?.user?.email;
    
    if (!testEmail) {
      toast.error("Não foi possível obter seu email para envio de teste");
      return false;
    }
    
    // Show toast to indicate test is starting
    toast.loading(`Enviando email de teste para ${testEmail}`);
    
    try {
      const result = await sendTestEmail(templateId, testEmail);
      return result;
    } catch (error) {
      console.error("Error sending test:", error);
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

  // Skeleton loader component for loading state
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Templates</h1>
        {!isCreating && (
          <Button onClick={handleCreateClick} className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Template
          </Button>
        )}
      </div>

      {isCreating ? (
        <TemplateForm
          template={selectedTemplate || undefined}
          isEditing={isEditing}
          onSave={async (formData) => {
            try {
              if (isEditing && selectedTemplate) {
                await updateTemplate(selectedTemplate.id, formData);
                toast.success("Template atualizado com sucesso!");
              } else {
                await createTemplate(formData);
                toast.success("Template criado com sucesso!");
              }
              setIsCreating(false);
              setIsEditing(false);
              setSelectedTemplate(null);
              // Refresh templates after saving
              loadTemplates();
              return true;
            } catch (error) {
              console.error("Error saving template:", error);
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
      ) : loading && !isInitialized ? (
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
          {/* Campo de pesquisa */}
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
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Você ainda não criou nenhum template.</p>
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
                  onDuplicate={() => duplicateTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Templates;
