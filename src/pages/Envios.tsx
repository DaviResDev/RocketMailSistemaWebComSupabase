
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
import { Mail, MessageSquare, Paperclip, RefreshCw, AlertCircle, Download, CheckCircle } from 'lucide-react';
import { useEnvios } from '@/hooks/useEnvios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function Envios() {
  const { envios, loading, sending, fetchEnvios, resendEnvio } = useEnvios();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch envios when component mounts
    fetchEnvios();
    
    // Set up real-time subscription for updates
    const enviosChannel = supabase
      .channel('envios_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'envios' },
        () => fetchEnvios()
      )
      .subscribe();
      
    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(enviosChannel);
    };
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
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao baixar o anexo: ${error.message}`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Envios</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchEnvios()}
          className="flex items-center gap-2 bg-white hover:bg-gray-100 border border-gray-200 shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </>
          )}
        </Button>
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
                        {/* Default to 'email' if template.canal is not defined */}
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={envio.status === 'entregue' ? 'default' : 
                                envio.status === 'pendente' ? 'secondary' : 
                                'destructive'}
                      >
                        <span className="flex items-center gap-1">
                          {envio.status === 'entregue' && <CheckCircle className="h-3 w-3" />}
                          {envio.status}
                        </span>
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
