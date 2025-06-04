
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, User, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Schedule } from '@/hooks/useSchedules';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SchedulesListProps {
  schedules: Schedule[];
  onRefresh: () => Promise<void>;
}

export function SchedulesList({ schedules, onRefresh }: SchedulesListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enviado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge variant="outline" className="text-green-600 border-green-600">Enviado</Badge>;
      case 'erro':
        return <Badge variant="outline" className="text-red-600 border-red-600">Erro</Badge>;
      default:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Mail className="h-5 w-5 mr-2" />
                {schedule.template?.nome || 'Template sem nome'}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusIcon(schedule.status)}
                {getStatusBadge(schedule.status)}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{schedule.contato?.nome}</p>
                  <p className="text-sm text-muted-foreground">{schedule.contato?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {new Date(schedule.data_envio).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(schedule.data_envio), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
              </div>
            </div>

            {schedule.contato?.razao_social && (
              <div className="text-sm text-muted-foreground">
                <strong>Empresa:</strong> {schedule.contato.razao_social}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Criado {formatDistanceToNow(new Date(schedule.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
              
              {schedule.status === 'pendente' && new Date(schedule.data_envio) <= new Date() && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Pronto para envio
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {schedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhum agendamento encontrado</p>
            <p className="text-muted-foreground">
              Crie seu primeiro agendamento para começar a enviar emails automaticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
