
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Templates() {
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    conteudo: '',
    canal: 'email' // default to email
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return;
    }

    try {
      const { error } = await supabase
        .from('templates')
        .insert([
          {
            nome: newTemplate.nome,
            conteudo: newTemplate.conteudo,
            canal: newTemplate.canal,
            user_id: user.id
          }
        ]);

      if (error) throw error;

      toast.success('Template criado com sucesso!');
      setIsCreating(false);
      setNewTemplate({ nome: '', conteudo: '', canal: 'email' });
      
    } catch (error: any) {
      toast.error('Erro ao criar template: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Template
        </Button>
      </div>

      {isCreating ? (
        <Card>
          <form onSubmit={handleCreateTemplate}>
            <CardHeader>
              <h3 className="text-lg font-semibold">Novo Template</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-1">
                  Nome do Template
                </label>
                <Input
                  id="nome"
                  value={newTemplate.nome}
                  onChange={(e) => setNewTemplate({ ...newTemplate, nome: e.target.value })}
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
                  value={newTemplate.conteudo}
                  onChange={(e) => setNewTemplate({ ...newTemplate, conteudo: e.target.value })}
                  placeholder="Digite o conteúdo do seu template..."
                  className="min-h-[200px]"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Cancelar
              </Button>
              <Button type="submit">
                Criar Template
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Plus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum template criado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Crie seu primeiro template clicando no botão "Novo Template" acima.
          </p>
        </div>
      )}
    </div>
  );
}
