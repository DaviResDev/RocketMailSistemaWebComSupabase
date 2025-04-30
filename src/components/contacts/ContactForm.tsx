
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { ContactFormData, Contact, useContacts } from '@/hooks/useContacts';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
      razao_social: '',
      cliente: '',
      tags: []
    }
  );
  
  const [newTag, setNewTag] = useState('');
  const { createContact, updateContact, getTags } = useContacts();
  const existingTags = getTags();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = isEditing && initialData?.id
      ? await updateContact(initialData.id, formData)
      : await createContact(formData);

    if (success) {
      onCancel();
    }
  };
  
  const addTag = () => {
    if (!newTag.trim()) return;
    
    const tag = newTag.trim().toLowerCase();
    
    // Check if tag already exists
    if (formData.tags?.includes(tag)) {
      setNewTag('');
      return;
    }
    
    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tag]
    });
    
    setNewTag('');
  };
  
  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: (formData.tags || []).filter(tag => tag !== tagToRemove)
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  const selectExistingTag = (tag: string) => {
    if ((formData.tags || []).includes(tag)) {
      return;
    }
    
    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tag]
    });
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
            <Label htmlFor="cliente">Nome do Cliente</Label>
            <Input
              id="cliente"
              value={formData.cliente || ''}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input
              id="razao_social"
              value={formData.razao_social || ''}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
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
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="+5511999887766"
            />
          </div>
          
          <div>
            <Label className="mb-2 block">Tags</Label>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="px-3 py-1">
                  {tag}
                  <button 
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            {existingTags.length > 0 && (
              <div className="mb-2">
                <Select onValueChange={selectExistingTag}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma tag existente" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Nova tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
