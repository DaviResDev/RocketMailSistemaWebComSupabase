
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function EnviosPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Envios</h1>
          <p className="text-muted-foreground">Funcionalidade removida - apenas para gerenciamento de templates</p>
        </div>
      </div>
      
      <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Funcionalidade Removida:</strong> O histórico de envios não está mais disponível pois as funcionalidades de envio de email foram removidas do sistema. 
          Você pode continuar usando o sistema para gerenciar templates e contatos.
        </AlertDescription>
      </Alert>
      
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Esta página estava relacionada ao envio de emails, funcionalidade que foi removida do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
