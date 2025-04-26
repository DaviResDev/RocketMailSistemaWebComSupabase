
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Template = {
  id: string;
  nome: string;
  conteudo: string;
  canal: string;
  created_at: string;
};

export default function Templates() {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    canal: 'email'
  });
  const { user } = useAuth();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('templates')
          .update({
            nome: formData.nome,
            conteudo: formData.conteudo,
            canal: formData.canal,
          })
          .eq('id', isEditing);

        if (error) throw error;
        toast.success('Template atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('templates')
          .insert([
            {
              nome: formData.nome,
              conteudo: formData.conteudo,
              canal: formData.canal,
              user_id: user.id
            }
          ]);

        if (error) throw error;
        toast.success('Template criado com sucesso!');
      }

      setIsCreating(false);
      setIsEditing(null);
      setFormData({ nome: '', conteudo: '', canal: 'email' });
      fetchTemplates();
      
    } catch (error: any) {
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} template: ` + error.message);
    }
  };

  const handleEdit = (template: Template) => {
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

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template excluído com sucesso!');
      fetchTemplates();
    } catch (error: any) {
      toast.error('Erro ao excluir template: ' + error.message);
    }
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
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {isEditing ? 'Editar Template' : 'Novo Template'}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-1">
                  Nome do Template
                </label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Template de Boas-vindas"
                  required
                />
              </div>
              <div>
                <label htmlFor="conteudo" className="block text-sm font-medium mb-1">
                  Conteúdo
                </label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Digite o conteúdo do seu template..."
                  className="min-h-[200px]"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between space-x-2">
              <Button 
                variant="ghost" 
                type="button"
                onClick={handleCancel}
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
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{template.nome}</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {template.conteudo.length > 200
                    ? template.conteudo.substring(0, 200) + '...'
                    : template.conteudo}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
