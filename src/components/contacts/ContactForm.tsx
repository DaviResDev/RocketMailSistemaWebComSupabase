
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { ContactFormData, Contact, useContacts } from '@/hooks/useContacts';

interface ContactFormProps {
  onCancel: () => void;
  initialData?: ContactFormData & { id?: string };
  isEditing?: boolean;
}

export function ContactForm({ onCancel, initialData, isEditing = false }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>(
    initialData || {
      nome: '',
      email: '',
      telefone: '',
    }
  );

  const { createContact, updateContact } = useContacts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = isEditing && initialData?.id
      ? await updateContact(initialData.id, formData)
      : await createContact(formData);

    if (success) {
      onCancel();
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Editar Contato' : 'Novo Contato'}
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="+5511999887766"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between space-x-2">
          <Button 
            variant="ghost" 
            type="button"
            onClick={onCancel}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit">
            {isEditing ? 'Atualizar' : 'Criar'} Contato
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
