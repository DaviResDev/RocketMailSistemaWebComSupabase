
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Mail, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEnvios } from '@/hooks/useEnvios';
import { Schedule } from '@/hooks/useSchedules';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface SchedulesListProps {
  schedules: Schedule[];
  onRefresh: () => Promise<void>;
}

export function SchedulesList({ schedules, onRefresh }: SchedulesListProps) {
  const { sendEmail } = useEnvios();
  const [loading, setLoading] = useState(false);

  const handleSendNow = async (schedule: Schedule) => {
    try {
      setLoading(true);
      // Convert schedule to EnvioFormData format
      const envioData = {
        contato_id: schedule.contato_id,
        template_id: schedule.template_id
      };
      
      // Send email immediately using sendEmail
      await sendEmail(envioData);
      
      // Update schedule status
      await supabase
        .from('agendamentos')
        .update({ status: 'enviado' })
        .eq('id', schedule.id);
      
      toast.success('Email enviado com sucesso!');
      
      // Refresh schedules list
      onRefresh();
    } catch (err: any) {
      console.error('Error sending scheduled email:', err);
      toast.error(`Erro ao enviar email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      // Delete the schedule
      await supabase
        .from('agendamentos')
        .delete()
        .eq('id', scheduleId);
      
      toast.success('Agendamento cancelado com sucesso!');
      
      // Refresh schedules list
      onRefresh();
    } catch (err: any) {
      console.error('Error canceling schedule:', err);
      toast.error(`Erro ao cancelar agendamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum agendamento encontrado</h3>
        <p className="text-muted-foreground mt-2 text-center">
          Os agendamentos de envio aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Agendada</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(schedule.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center text-muted-foreground text-xs mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(schedule.data_envio), "HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {schedule.contato ? schedule.contato.nome : `Contato ID: ${schedule.contato_id.slice(0, 8)}...`}
                </TableCell>
                <TableCell>
                  {schedule.template ? schedule.template.nome : `Template ID: ${schedule.template_id.slice(0, 8)}...`}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      schedule.status === 'pendente' ? 'secondary' : 
                      schedule.status === 'enviado' ? 'default' : 
                      schedule.status === 'falha' ? 'destructive' : 
                      'outline'
                    }
                  >
                    {schedule.status === 'pendente' ? 'Pendente' : 
                     schedule.status === 'enviado' ? 'Enviado' : 
                     schedule.status === 'falha' ? 'Falhou' : 
                     schedule.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSendNow(schedule)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar agora
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCancelSchedule(schedule.id)}>
                        Cancelar agendamento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
