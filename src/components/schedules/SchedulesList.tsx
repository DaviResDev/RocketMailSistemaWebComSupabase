import React, { useState, useEffect } from 'react';
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
import { Calendar, Clock, Mail, MoreHorizontal, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEnvios } from '@/hooks/useEnvios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SchedulesList() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Replace createEnvio with sendEmail
  const { sendEmail } = useEnvios();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      // Fetch schedules from API or database
      // This is a placeholder for the actual implementation
      const response = await fetch('/api/schedules');
      const data = await response.json();
      setSchedules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (schedule) => {
    try {
      // Convert schedule to EnvioFormData format
      const envioData = {
        contato_id: schedule.contato_id,
        template_id: schedule.template_id,
        cc: schedule.cc,
        bcc: schedule.bcc,
        attachments: schedule.attachments
      };
      
      // Send email immediately using sendEmail
      await sendEmail(envioData);
      
      // Update schedule status
      // This is a placeholder for the actual implementation
      await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'sent' })
      });
      
      // Refresh schedules list
      fetchSchedules();
    } catch (err) {
      console.error('Error sending scheduled email:', err);
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    try {
      // Cancel the schedule
      // This is a placeholder for the actual implementation
      await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      
      // Refresh schedules list
      fetchSchedules();
    } catch (err) {
      console.error('Error canceling schedule:', err);
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar agendamentos: {error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={fetchSchedules}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
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
                      {format(new Date(schedule.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center text-muted-foreground text-xs mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(schedule.scheduled_date), "HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{schedule.contato?.nome}</TableCell>
                <TableCell>{schedule.template?.nome}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      schedule.status === 'pending' ? 'secondary' : 
                      schedule.status === 'sent' ? 'default' : 
                      schedule.status === 'failed' ? 'destructive' : 
                      'outline'
                    }
                  >
                    {schedule.status === 'pending' ? 'Pendente' : 
                     schedule.status === 'sent' ? 'Enviado' : 
                     schedule.status === 'failed' ? 'Falhou' : 
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
