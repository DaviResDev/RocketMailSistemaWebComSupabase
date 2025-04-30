
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
import { Button } from '@/components/ui/button';
import { Edit, MoreHorizontal, Trash } from 'lucide-react';
import { Contact, useContacts } from '@/hooks/useContacts';
import { useState } from 'react';
import { ContactForm } from './ContactForm';
import { Badge } from '@/components/ui/badge';

interface ContactsListProps {
  contacts: Contact[];
  selectedTags?: string[];
}

export function ContactsList({ contacts, selectedTags = [] }: ContactsListProps) {
  const { deleteContact } = useContacts();
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const filteredContacts = selectedTags.length > 0
    ? contacts.filter(contact => 
        contact.tags && contact.tags.some(tag => selectedTags.includes(tag)))
    : contacts;

  return (
    <>
      {editingContact && (
        <div className="mb-6">
          <ContactForm 
            initialData={{
              id: editingContact.id,
              nome: editingContact.nome,
              email: editingContact.email,
              telefone: editingContact.telefone || '',
              razao_social: editingContact.razao_social || '',
              cliente: editingContact.cliente || '',
              tags: editingContact.tags || []
            }}
            isEditing={true}
            onCancel={() => setEditingContact(null)}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.nome}</TableCell>
                <TableCell>{contact.cliente || '-'}</TableCell>
                <TableCell>{contact.razao_social || '-'}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.telefone || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(contact.tags || []).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mais opções</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o contato "{contact.nome}"? Esta ação excluirá também todos os envios e agendamentos associados a este contato.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteContact(contact.id)}
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
    </>
  );
}
