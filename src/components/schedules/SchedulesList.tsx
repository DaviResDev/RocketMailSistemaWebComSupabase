
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
import { MoreHorizontal, Trash, Edit, Send } from 'lucide-react';
import { Schedule, useSchedules } from '@/hooks/useSchedules';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { ScheduleForm } from './ScheduleForm';
import { toast } from 'sonner';
import { useEnvios } from '@/hooks/useEnvios';

interface SchedulesListProps {
  schedules: Schedule[];
}

export function SchedulesList({ schedules }: SchedulesListProps) {
  const { deleteSchedule, updateSchedule } = useSchedules();
  const { createEnvio } = useEnvios();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const handleSendNow = async (schedule: Schedule) => {
    setSending(schedule.id);
    
    try {
      const envioFormData = {
        contato_id: schedule.contato_id,
        template_id: schedule.template_id
      };
      
      const success = await createEnvio(envioFormData);
      
      if (success) {
        toast.success('Mensagem enviada com sucesso!');
        // Opcional: deletar o agendamento após envio bem sucedido
        // await deleteSchedule(schedule.id);
      }
    } catch (error) {
      console.error('Erro ao enviar agendamento:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      {editingSchedule && (
        <div className="mb-6">
          <ScheduleForm
            initialData={{
              id: editingSchedule.id,
              contato_id: editingSchedule.contato_id,
              template_id: editingSchedule.template_id,
              data_envio: new Date(editingSchedule.data_envio).toISOString().slice(0, 16)
            }}
            onCancel={() => setEditingSchedule(null)}
            isEditing={true}
          />
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data de Envio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  {format(new Date(schedule.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>{schedule.status}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {schedule.status === 'pendente' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={sending === schedule.id}
                        onClick={() => handleSendNow(schedule)}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {sending === schedule.id ? 'Enviando...' : 'Enviar Agora'}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Mais opções</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {schedule.status === 'pendente' && (
                          <DropdownMenuItem onClick={() => setEditingSchedule(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
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
                              <AlertDialogTitle>Excluir agendamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSchedule(schedule.id)}
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
