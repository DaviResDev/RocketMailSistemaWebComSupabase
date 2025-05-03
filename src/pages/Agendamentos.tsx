
import React, { useEffect, useState } from 'react';
import { useSchedules } from '@/hooks/useSchedules';
import { ScheduleForm } from '@/components/schedules/ScheduleForm';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SchedulesList } from '@/components/schedules/SchedulesList';

export default function Agendamentos() {
  const { schedules, loading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        await fetchSchedules();
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar agendamentos');
      }
    };
    
    loadSchedules();
  }, [fetchSchedules]);
  
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Ocorreu um erro ao carregar os agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button 
              className="mt-4"
              onClick={() => {
                toast.info('Recarregando agendamentos...');
                fetchSchedules().catch(err => {
                  setError(err.message || 'Erro ao recarregar agendamentos');
                });
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Agende o envio de uma mensagem para um contato.
              </DialogDescription>
            </DialogHeader>
            <ScheduleForm 
              onSubmit={async (formData) => {
                const success = await createSchedule(formData);
                if (success) {
                  toast.success('Agendamento criado com sucesso!');
                }
                return success;
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="past">Passados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <SchedulesList 
              items={schedules.filter(s => new Date(s.data_envio) >= new Date())}
              onDelete={deleteSchedule}
              onUpdate={updateSchedule}
              onRefresh={fetchSchedules}
            />
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <SchedulesList 
              items={schedules.filter(s => new Date(s.data_envio) < new Date())}
              onDelete={deleteSchedule}
              onUpdate={updateSchedule}
              onRefresh={fetchSchedules}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
