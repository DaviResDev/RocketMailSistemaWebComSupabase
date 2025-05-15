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
import useEnvios from '@/hooks/useEnvios';
import { Schedule } from '@/hooks/useSchedules';
import { toast } from '@/components/ui/use-toast';
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
  const { sendEmail, fetchEnvios } = useEnvios();
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const handleSendNow = async (schedule: Schedule) => {
    try {
      // Mark this specific item as loading
      setLoadingItems(prev => ({ ...prev, [schedule.id]: true }));
      
      // Show sending toast
      toast({
        title: "Enviando email",
        description: `Enviando para ${schedule.contato?.nome || 'contato'}`,
      });
      
      // Check if we have all required data
      if (!schedule.contato_id || !schedule.template_id) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Dados incompletos para envio: contato ou template faltando"
        });
        throw new Error("Dados incompletos para envio: contato ou template faltando");
      }
      
      // Ensure template exists
      if (!schedule.template) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Template não encontrado ou não carregado corretamente"
        });
        throw new Error("Template não encontrado ou não carregado corretamente");
      }
      
      // Get the full template details to include attachments
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', schedule.template_id)
        .single();
        
      if (templateError) {
        console.error("Erro ao buscar detalhes do template:", templateError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível buscar os detalhes do template"
        });
        throw templateError;
      }
      
      // Process template content with contact data for placeholders
      let processedContent = template.conteudo;
      
      if (schedule.contato) {
        const currentDate = new Date();
        const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
        
        processedContent = template.conteudo
          .replace(/{nome}/g, schedule.contato.nome || '')
          .replace(/{email}/g, schedule.contato.email || '')
          .replace(/{telefone}/g, schedule.contato.telefone || '')
          .replace(/{razao_social}/g, schedule.contato.razao_social || '')
          .replace(/{cliente}/g, schedule.contato.cliente || '')
          .replace(/{dia}/g, formattedDate);
      }
      
      // Parse template attachments if they exist
      let attachmentsData = null;
      if (template.attachments) {
        if (typeof template.attachments === 'string' && template.attachments !== '[]') {
          try {
            attachmentsData = JSON.parse(template.attachments);
          } catch (err) {
            console.error('Erro ao analisar anexos:', err);
            // Continue without attachments
          }
        } else if (Array.isArray(template.attachments) && template.attachments.length > 0) {
          attachmentsData = template.attachments;
        } else if (template.attachments && typeof template.attachments === 'object') {
          attachmentsData = template.attachments;
        }
      }
      
      // Prepare data to send
      const envioData = {
        contato_id: schedule.contato_id,
        template_id: schedule.template_id,
        agendamento_id: schedule.id,
        // Pass the processed attachments
        attachments: attachmentsData,
        // Pass these explictly to the edge function:
        subject: template.nome,
        content: processedContent,
        signature_image: template.signature_image,
        contato_nome: schedule.contato?.nome,
        contato_email: schedule.contato?.email
      };
      
      // Log the data being sent
      console.log("Enviando email com os seguintes dados:", {
        contato: schedule.contato,
        template: template.nome,
        content_length: processedContent.length,
        agendamento: schedule.id,
        temAnexos: !!attachmentsData && 
                  (Array.isArray(attachmentsData) ? attachmentsData.length > 0 : true)
      });
      
      // Send email immediately using sendEmail
      const result = await sendEmail(envioData);
      
      if (!result) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao enviar o email. Verifique sua conexão com a internet."
        });
        throw new Error("Falha ao enviar o email");
      }
      
      // Atualizar agendamento para status enviado
      await supabase
        .from('agendamentos')
        .update({ status: 'enviado' })
        .eq('id', schedule.id);
      
      toast({
        title: "Sucesso",
        description: `Email enviado com sucesso para ${schedule.contato?.nome}!`
      });
      
      // Refresh both schedules list and email history
      await fetchEnvios(); // Fetch email history to update Dashboard and Envios page
      await onRefresh(); // Refresh schedules list
    } catch (err: any) {
      console.error('Erro ao enviar email agendado:', err);
      
      // More detailed error message
      let errorMessage = "Erro desconhecido";
      
      if (typeof err === 'object' && err !== null) {
        if (err.message) {
          errorMessage = err.message;
        }
        
        // Log detailed error information for debugging
        console.log('Detalhes do erro:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          data: err.data,
        });
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: errorMessage
      });
      
      // Se houver erro, também atualizar status do agendamento
      await supabase
        .from('agendamentos')
        .update({ status: 'falha' })
        .eq('id', schedule.id);
    } finally {
      // Always unmark the item as loading
      setLoadingItems(prev => ({ ...prev, [schedule.id]: false }));
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      setLoadingItems(prev => ({ ...prev, [scheduleId]: true }));
      
      // Delete the schedule
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', scheduleId);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Sucesso",
        description: 'Agendamento cancelado com sucesso!'
      });
      
      // Refresh schedules list
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao cancelar agendamento: ${err.message}`
      });
    } finally {
      // Always unmark the item as loading
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
                        disabled={loadingItems[schedule.id] || !schedule.contato || !schedule.template || schedule.status === 'enviado'}
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
