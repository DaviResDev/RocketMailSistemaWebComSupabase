
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Import, Plus, Search, Users } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import { ContactsList } from '@/components/contacts/ContactsList';
import { ContactForm } from '@/components/contacts/ContactForm';

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { contacts, loading, fetchContacts } = useContacts();

  useEffect(() => {
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) =>
    contact.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.telefone && contact.telefone.includes(searchTerm))
  );

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Em breve: Importação de contatos via arquivo "${file.name}"`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
        <div className="flex flex-wrap gap-2">
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Contato
            </Button>
          )}
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

      {isCreating && (
        <ContactForm onCancel={() => setIsCreating(false)} />
      )}

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando contatos...</p>
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum contato encontrado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Comece adicionando seu primeiro contato ou importe seus contatos via CSV.
          </p>
        </div>
      ) : (
        <ContactsList contacts={filteredContacts} />
      )}
    </div>
  );
}
