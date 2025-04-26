
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTemplates, TemplateFormData } from '@/hooks/useTemplates';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateCard } from '@/components/templates/TemplateCard';

export default function Templates() {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    nome: '',
    conteudo: '',
    canal: 'email'
  });

  const {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplates();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = isEditing
      ? await updateTemplate(isEditing, formData)
      : await createTemplate(formData);

    if (success) {
      handleCancel();
    }
  };

  const handleEdit = (template: any) => {
    setFormData({
      nome: template.nome,
      conteudo: template.conteudo,
      canal: template.canal
    });
    setIsEditing(template.id);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setFormData({ nome: '', conteudo: '', canal: 'email' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Template
          </Button>
        )}
      </div>

      {isCreating ? (
        <TemplateForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!isEditing}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Plus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum template criado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Crie seu primeiro template clicando no botão "Novo Template" acima.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={deleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
