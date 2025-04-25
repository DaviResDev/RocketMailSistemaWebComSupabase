
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { FileText, Mail, MessageSquare, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Mock templates data
const mockTemplates = [
  {
    id: '1',
    nome: 'Boas-vindas',
    canal: 'email',
    created_at: '2023-10-15T14:30:00',
  },
  {
    id: '2',
    nome: 'Promoção Semanal',
    canal: 'email',
    created_at: '2023-10-14T10:15:00',
  },
  {
    id: '3',
    nome: 'Lembrete de Aniversário',
    canal: 'whatsapp',
    created_at: '2023-10-13T08:45:00',
  },
  {
    id: '4',
    nome: 'Confirmação de Compra',
    canal: 'whatsapp',
    created_at: '2023-10-12T16:20:00',
  },
  {
    id: '5',
    nome: 'Newsletter Mensal',
    canal: 'email',
    created_at: '2023-10-11T09:30:00',
  },
  {
    id: '6',
    nome: 'Notificação de Entrega',
    canal: 'whatsapp',
    created_at: '2023-10-10T14:00:00',
  },
];

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState(mockTemplates);

  const filteredTemplates = templates.filter((template) =>
    template.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((template) => template.id !== id));
    toast.success('Template excluído com sucesso!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <Button asChild>
          <Link to="/templates/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo Template
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Não encontramos nenhum template com esse nome. Tente uma busca diferente ou crie um novo template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-0">
                <div className={`h-2 w-full rounded-t-lg ${template.canal === 'email' ? 'bg-primary' : 'bg-success'}`} />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{template.nome}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Criado em {formatDate(template.created_at)}
                    </p>
                    <div className="mt-3">
                      <Badge variant={template.canal === 'email' ? 'default' : 'outline'} className="flex items-center gap-1">
                        {template.canal === 'email' ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                        {template.canal === 'email' ? 'Email' : 'WhatsApp'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Mais opções</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/templates/${template.id}`}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/templates/${template.id}/visualizar`}>Visualizar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/agendamentos/novo?template=${template.id}`}>Agendar Envio</Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o template "{template.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-end">
                <Button variant="secondary" asChild>
                  <Link to={`/templates/${template.id}`}>
                    Visualizar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
