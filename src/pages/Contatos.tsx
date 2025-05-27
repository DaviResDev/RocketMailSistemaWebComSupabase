
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Import, Plus, Search, Users, Tag } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import { ContactsList } from '@/components/contacts/ContactsList';
import { ContactForm } from '@/components/contacts/ContactForm';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { processImportFile, getFileType } from '@/utils/fileImportUtils';

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { contacts, loading, fetchContacts, getTags } = useContacts();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) =>
    contact.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.telefone && contact.telefone.includes(searchTerm)) ||
    (contact.cliente && contact.cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.razao_social && contact.razao_social.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      
      // Reset the input so the same file can be selected again
      e.target.value = '';
      
      const fileType = getFileType(file);
      const fileTypeText = fileType === 'csv' ? 'CSV' : fileType === 'excel' ? 'Excel' : 'desconhecido';
      
      toast.info(`Importando contatos do arquivo ${fileTypeText} "${file.name}"...`);
      
      // Process the file using our new utility
      const result = await processImportFile(file);
      
      if (!result.success) {
        toast.error(`Erro na importação: ${result.errors.join(', ')}`);
        setIsImporting(false);
        return;
      }
      
      if (result.data.length === 0) {
        toast.error('Nenhum contato válido encontrado no arquivo. Certifique-se de que o arquivo contenha colunas "nome" e "email" válidas.');
        setIsImporting(false);
        return;
      }
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        toast.error('Você precisa estar logado para importar contatos');
        setIsImporting(false);
        return;
      }
      
      // Prepare contacts for insertion
      const contactsToImport = result.data.map(contact => ({
        ...contact,
        user_id: userData.user.id
      }));
      
      // Insert contacts in batches to avoid request size limitations
      const batchSize = 20;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < contactsToImport.length; i += batchSize) {
        const batch = contactsToImport.slice(i, i + batchSize);
        const { error } = await supabase
          .from('contatos')
          .insert(batch);
        
        if (error) {
          console.error('Erro ao importar lote de contatos:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }
      
      // Refresh contacts list
      fetchContacts();
      
      // Show detailed results
      if (successCount > 0) {
        const message = `${successCount} contatos importados com sucesso!`;
        if (result.errors.length > 0) {
          toast.success(`${message} (${result.errors.length} linhas com problemas foram ignoradas)`);
        } else {
          toast.success(message);
        }
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} contatos não puderam ser importados. Verifique os logs para mais detalhes.`);
      }
      
      // Show processing summary
      if (result.errors.length > 0) {
        console.log('Erros durante a importação:', result.errors);
        toast.info(`Processados: ${result.totalRows} linhas, Válidos: ${result.validRows}, Erros: ${result.errors.length}`);
      }
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };
  
  const availableTags = getTags();

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
              accept=".csv, .xlsx, .xls" 
              id="file-upload" 
              className="hidden" 
              onChange={handleImportCSV} 
              disabled={isImporting}
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isImporting}
            >
              <Import className="mr-2 h-4 w-4" /> 
              {isImporting ? 'Importando...' : 'Importar Arquivo'}
            </Button>
          </div>
        </div>
      </div>

      {isCreating && (
        <ContactForm onCancel={() => setIsCreating(false)} />
      )}

      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        
        {availableTags.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-2 mt-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por tags:</span>
            {availableTags.map(tag => (
              <Badge 
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTags([])}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}
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
            Comece adicionando seu primeiro contato ou importe seus contatos via arquivo.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Tipos de arquivos aceitos: CSV (.csv), Excel (.xlsx, .xls)
          </p>
        </div>
      ) : (
        <>
          <ContactsList 
            contacts={filteredContacts} 
            selectedTags={selectedTags}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tipos de arquivos aceitos: CSV (.csv), Excel (.xlsx, .xls)
          </p>
        </>
      )}
    </div>
  );
}
