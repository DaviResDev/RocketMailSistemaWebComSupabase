
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface VariableInserterProps {
  onInsertVariable: (variable: string) => void;
}

const availableVariables = [
  { key: '{nome}', description: 'Nome do contato' },
  { key: '{cliente}', description: 'Nome do cliente/empresa' },
  { key: '{email}', description: 'Email do contato' },
  { key: '{telefone}', description: 'Telefone do contato' },
  { key: '{razao_social}', description: 'Razão social da empresa' },
  { key: '{endereco}', description: 'Endereço do contato' },
  { key: '{data}', description: 'Data atual' },
  { key: '{hora}', description: 'Hora atual' },
  { key: '{produto}', description: 'Nome do produto' },
  { key: '{valor}', description: 'Valor/Preço' },
  { key: '{vencimento}', description: 'Data de vencimento' },
  { key: '{cargo}', description: 'Cargo do contato' },
  { key: '{empresa}', description: 'Nome da empresa' }
];

export function VariableInserter({ onInsertVariable }: VariableInserterProps) {
  const handleInsertVariable = (variable: string) => {
    onInsertVariable(variable);
    toast.success(`Variável ${variable} inserida!`);
  };

  const copyToClipboard = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Variável ${variable} copiada!`);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Variáveis Dinâmicas
        </CardTitle>
        <CardDescription>
          Clique em uma variável para inserir no template ou copiar para a área de transferência
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableVariables.map((variable) => (
            <div key={variable.key} className="group">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors w-full justify-between"
                onClick={() => handleInsertVariable(variable.key)}
              >
                <span className="font-mono text-xs">{variable.key}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(variable.key);
                    }}
                  />
                </div>
              </Badge>
              <p className="text-xs text-muted-foreground mt-1 px-2">
                {variable.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
