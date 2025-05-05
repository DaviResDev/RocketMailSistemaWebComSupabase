
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
import { Calendar, Clock, Mail, MoreHorizontal, AlertCircle } from 'lucide-react';
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
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const handleSendNow = async (schedule: Schedule) => {
    try {
      // Marcar item específico como carregando
      setLoadingItems(prev => ({ ...prev, [schedule.id]: true }));
      
      // Mostrar toast de "enviando"
      const toastId = toast.loading(`Enviando email para ${schedule.contato?.nome || 'contato'}...`);
      
      // Verificar se todos os dados necessários estão presentes
      if (!schedule.contato_id || !schedule.template_id) {
        throw new Error("Dados incompletos para envio: contato ou template faltando");
      }
      
      // Converter schedule para EnvioFormData
      const envioData = {
        contato_id: schedule.contato_id,
        template_id: schedule.template_id
      };
      
      // Enviar email imediatamente usando sendEmail
      const result = await sendEmail(envioData);
      
      if (!result) {
        throw new Error("Falha ao enviar o email");
      }
      
      // Atualizar status do agendamento
      await supabase
        .from('agendamentos')
        .update({ status: 'enviado' })
        .eq('id', schedule.id);
      
      toast.success('Email enviado com sucesso!', { id: toastId });
      
      // Atualizar lista de agendamentos
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao enviar email agendado:', err);
      toast.error(`Erro ao enviar email: ${err.message}`);
      
      // Registrar erro detalhado no console para depuração
      console.error('Detalhes do erro:', {
        schedule,
        error: err,
        stack: err.stack
      });
    } finally {
      // Desmarcar item específico como carregando
      setLoadingItems(prev => ({ ...prev, [schedule.id]: false }));
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      setLoadingItems(prev => ({ ...prev, [scheduleId]: true }));
      // Excluir o agendamento
      await supabase
        .from('agendamentos')
        .delete()
        .eq('id', scheduleId);
      
      toast.success('Agendamento cancelado com sucesso!');
      
      // Atualizar lista de agendamentos
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error(`Erro ao cancelar agendamento: ${err.message}`);
    } finally {
      setLoadingItems(prev => ({ ...prev, [scheduleId]: false }));
    }
  };

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
                  {schedule.contato ? (
                    <div className="flex flex-col">
                      <span>{schedule.contato.nome}</span>
                      <span className="text-xs text-muted-foreground">{schedule.contato.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Contato não encontrado
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {schedule.template ? (
                    schedule.template.nome
                  ) : (
                    <div className="flex items-center text-amber-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Template não encontrado
                    </div>
                  )}
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={loadingItems[schedule.id]}
                      >
                        {loadingItems[schedule.id] ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                          </span>
                        ) : (
                          <>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleSendNow(schedule)}
                        disabled={loadingItems[schedule.id] || !schedule.contato || !schedule.template}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar agora
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCancelSchedule(schedule.id)}
                        disabled={loadingItems[schedule.id]}
                        className="text-destructive"
                      >
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
