import { useState, useEffect } from 'react';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { Template, TemplateFormData } from '@/types/template';

const Templates = () => {
  const { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState<TemplateFormData>({
    nome: '',
    conteudo: '',
    canal: 'email',
    status: 'ativo',
  });

  useEffect(() => {
    if (user) {
      fetchTemplates().catch(err => {
        setErrorMessage(err.message);
      });
    }
  }, [fetchTemplates, user]);

  const handleCreateClick = () => {
    setFormData({
      nome: '',
      conteudo: '',
      canal: 'email',
      status: 'ativo',
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
      canal: template.canal || 'email',
      signature_image: template.signature_image || null,
      status: template.status,
    });
    setIsEditing(true);
    setIsCreating(true);
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
            return true;
          }}
          onCancel={() => {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedTemplate(null);
          }}
        />
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando templates...</p>
        </div>
      ) : errorMessage ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">Erro ao carregar templates: {errorMessage}</p>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Você ainda não criou nenhum template.</p>
          <Button onClick={handleCreateClick} className="flex items-center mx-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Criar primeiro template
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="email">
          <div className="mb-4">
            <TabsList>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
            </TabsList>
          </div>
          
          {['email', 'whatsapp', 'sms'].map(canal => (
            <TabsContent key={canal} value={canal} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates
                .filter(template => template.canal === canal)
                .map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => handleEditClick(template)}
                    onDelete={() => deleteTemplate(template.id)}
                  />
                ))}
              {templates.filter(template => template.canal === canal).length === 0 && (
                <div className="col-span-full">
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">Nenhum template de {canal} encontrado.</p>
                    <Button onClick={handleCreateClick} className="flex items-center mx-auto">
                      <PlusCircle className="mr-2 h-4 w-4" /> Criar template de {canal}
                    </Button>
                  </Card>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default Templates;
