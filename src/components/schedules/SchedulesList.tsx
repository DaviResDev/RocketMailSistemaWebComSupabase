
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Schedule } from '@/hooks/useSchedules';

interface SchedulesListProps {
  schedules: Schedule[];
  onRefresh: () => Promise<void>;
}

export function SchedulesList({ schedules, onRefresh }: SchedulesListProps) {
  return (
    <div className="space-y-4">
      <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Funcionalidade Removida:</strong> O envio de emails agendados não está mais disponível pois as funcionalidades de envio de email foram removidas do sistema.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Esta funcionalidade estava relacionada ao envio de emails, que foi removido do sistema.
            Você pode continuar usando o sistema para gerenciar templates e contatos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
