
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, MessageSquare, Paperclip, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { useEnvios } from '@/hooks/useEnvios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export default function Envios() {
  const { envios, loading, sending, fetchEnvios, resendEnvio } = useEnvios();
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEnvios();
  }, []);

  const handleResendEmail = async (id: string) => {
    setResendingId(id);
    try {
      await resendEnvio(id);
    } finally {
      setResendingId(null);
    }
  };

  const downloadAttachment = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('email-attachments')
        .download(path);
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Create a URL for the downloaded file
        const url = URL.createObjectURL(data);
        
        // Create an invisible anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      alert(`Erro ao baixar o anexo: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Envios</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando histórico de envios...</p>
          </div>
        </div>
      ) : envios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum envio encontrado</h3>
          <p className="text-muted-foreground mt-2 text-center">
            Os envios realizados aparecerão aqui.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Envios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell>
                      {format(new Date(envio.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{envio.contato?.nome}</TableCell>
                    <TableCell>{envio.template?.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {envio.template?.canal === 'email' ? (
                          <Mail className="w-4 h-4 mr-2" />
                        ) : (
                          <MessageSquare className="w-4 h-4 mr-2" />
                        )}
                        {envio.template?.canal === 'email' ? 'Email' : 'WhatsApp'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={envio.status === 'entregue' ? 'default' : 
                                envio.status === 'pendente' ? 'secondary' : 
                                'destructive'}
                      >
                        {envio.status}
                      </Badge>
                      {envio.status === 'erro' && envio.erro && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 inline-block ml-2 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{envio.erro}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell>
                      {envio.attachments && envio.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {envio.attachments.map((attachment, index) => (
                            <Button 
                              key={index} 
                              variant="ghost" 
                              size="sm" 
                              className="flex items-center text-xs"
                              onClick={() => downloadAttachment(attachment.file_path, attachment.file_name)}
                            >
                              <Paperclip className="h-3.5 w-3.5 mr-1" />
                              <span className="truncate max-w-[150px]">{attachment.file_name}</span>
                              <Download className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Nenhum anexo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {envio.status === 'erro' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={sending || resendingId === envio.id}
                          onClick={() => handleResendEmail(envio.id)}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${resendingId === envio.id ? 'animate-spin' : ''}`} />
                          Reenviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
