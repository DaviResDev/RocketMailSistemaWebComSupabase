
import { useState, useEffect, useCallback } from 'react';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Template, TemplateFormData } from '@/types/template';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Templates = () => {
  const { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState<TemplateFormData>({
    nome: '',
    conteudo: '',
    status: 'ativo',
  });

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
    if (!isInitialized) {
      loadTemplates();
    }
  }, [loadTemplates, retryCount, isInitialized]);

  const handleCreateClick = () => {
    setFormData({
      nome: '',
      conteudo: '',
      status: 'ativo'
    });
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleEditClick = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      nome: template.nome,
      conteudo: template.conteudo,
      signature_image: template.signature_image || null,
      status: template.status || 'ativo',
    });
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsInitialized(false);
  };

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
                toast({
                  title: "Sucesso",
                  description: "Template atualizado com sucesso!"
                });
              } else {
                await createTemplate(formData);
                toast({
                  title: "Sucesso",
                  description: "Template criado com sucesso!"
                });
              }
              setIsCreating(false);
              setIsEditing(false);
              setSelectedTemplate(null);
              // Refresh templates after saving
              loadTemplates();
              return true;
            } catch (error) {
              return false;
            }
          }}
          onCancel={() => {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedTemplate(null);
          }}
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
      ) : templates.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Você ainda não criou nenhum template.</p>
          <Button onClick={handleCreateClick} className="flex items-center mx-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Criar primeiro template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEditClick(template)}
              onDelete={() => deleteTemplate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
