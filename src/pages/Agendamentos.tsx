
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { ScheduleForm } from '@/components/schedules/ScheduleForm';
import { SchedulesList } from '@/components/schedules/SchedulesList';

export default function Agendamentos() {
  const [isCreating, setIsCreating] = useState(false);
  const { schedules, loading, fetchSchedules } = useSchedules();

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <div className="flex flex-wrap gap-2">
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <ScheduleForm onCancel={() => setIsCreating(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando agendamentos...</p>
          </div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum agendamento encontrado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Agende seu primeiro envio para começar.
          </p>
        </div>
      ) : (
        <SchedulesList schedules={schedules} />
      )}
    </div>
  );
}
