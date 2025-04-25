
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Import, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Trash, 
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

// Mock contacts data
const mockContacts = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'joao.silva@email.com',
    telefone: '+5511999887766',
    tags: ['cliente', 'premium'],
    grupo: 'Clientes',
  },
  {
    id: '2',
    nome: 'Maria Oliveira',
    email: 'maria.oliveira@email.com',
    telefone: '+5511988776655',
    tags: ['cliente', 'novo'],
    grupo: 'Clientes',
  },
  {
    id: '3',
    nome: 'Pedro Santos',
    email: 'pedro.santos@email.com',
    telefone: '+5511977665544',
    tags: ['lead'],
    grupo: 'Leads',
  },
  {
    id: '4',
    nome: 'Ana Costa',
    email: 'ana.costa@email.com',
    telefone: '+5511966554433',
    tags: ['lead', 'interessado'],
    grupo: 'Leads',
  },
  {
    id: '5',
    nome: 'Lucas Ferreira',
    email: 'lucas.ferreira@email.com',
    telefone: '+5511955443322',
    tags: ['fornecedor'],
    grupo: 'Fornecedores',
  },
];

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState(mockContacts);
  const [newContact, setNewContact] = useState({
    nome: '',
    email: '',
    telefone: '',
    tags: '',
    grupo: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredContacts = contacts.filter((contact) =>
    contact.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.telefone.includes(searchTerm)
  );

  const handleSaveContact = () => {
    if (!newContact.nome || !newContact.email || !newContact.telefone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const tagsArray = newContact.tags
      ? newContact.tags.split(',').map((tag) => tag.trim())
      : [];

    const contact = {
      id: (contacts.length + 1).toString(),
      nome: newContact.nome,
      email: newContact.email,
      telefone: newContact.telefone,
      tags: tagsArray,
      grupo: newContact.grupo || 'Geral',
    };

    setContacts([...contacts, contact]);
    setNewContact({
      nome: '',
      email: '',
      telefone: '',
      tags: '',
      grupo: '',
    });
    setIsDialogOpen(false);
    toast.success('Contato adicionado com sucesso!');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Here would be the actual CSV processing logic
      // For now, we'll just show a success message
      setTimeout(() => {
        toast.success(`Arquivo "${file.name}" importado com sucesso!`);
        // Adding a mock contact to simulate import
        const newImportedContact = {
          id: (contacts.length + 1).toString(),
          nome: 'Contato Importado',
          email: 'importado@email.com',
          telefone: '+5511912345678',
          tags: ['importado'],
          grupo: 'Importados',
        };
        setContacts([...contacts, newImportedContact]);
      }, 1500);
    }
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((contact) => contact.id !== id));
    toast.success('Contato excluído com sucesso!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo Contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Contato</DialogTitle>
                <DialogDescription>
                  Preencha os dados para adicionar um novo contato.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nome" className="text-right">
                    Nome*
                  </Label>
                  <Input
                    id="nome"
                    value={newContact.nome}
                    onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email*
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="telefone" className="text-right">
                    Telefone*
                  </Label>
                  <Input
                    id="telefone"
                    value={newContact.telefone}
                    onChange={(e) => setNewContact({ ...newContact, telefone: e.target.value })}
                    className="col-span-3"
                    placeholder="+5511999887766"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    value={newContact.tags}
                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    className="col-span-3"
                    placeholder="cliente, lead (separadas por vírgula)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grupo" className="text-right">
                    Grupo
                  </Label>
                  <Input
                    id="grupo"
                    value={newContact.grupo}
                    onChange={(e) => setNewContact({ ...newContact, grupo: e.target.value })}
                    className="col-span-3"
                    placeholder="Ex: Clientes, Leads, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveContact}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <Input 
              type="file" 
              accept=".csv" 
              id="csv-upload" 
              className="hidden" 
              onChange={handleImportCSV} 
            />
            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
              <Import className="mr-2 h-4 w-4" /> Importar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum contato encontrado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Não encontramos nenhum contato com esse termo. Tente uma busca diferente ou adicione um novo contato.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.nome}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.telefone}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{contact.grupo}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Mais opções</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info('Editar contato')}>
                          Editar
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
                              <AlertDialogTitle>Excluir contato</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o contato "{contact.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContact(contact.id)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
