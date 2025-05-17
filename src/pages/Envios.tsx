
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnvios } from '@/hooks/useEnvios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseAttachments } from '@/types/envios';

export default function EnviosPage() {
  const { envios, loading, error, fetchEnvios, resendEnvio, sending } = useEnvios();
  
  useEffect(() => {
    fetchEnvios();
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enviado':
        return 'bg-green-500';
      case 'erro':
        return 'bg-red-500';
      case 'reenviado':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const handleResend = async (id: string) => {
    await resendEnvio(id);
    fetchEnvios();
  };
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Envios</h1>
          <p className="text-muted-foreground">Acompanhe os envios realizados e seus status</p>
        </div>
        <Button variant="outline" onClick={() => fetchEnvios()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p>Carregando histórico de envios...</p>
            </CardContent>
          </Card>
        ) : envios.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p>Nenhum envio registrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          envios.map((envio) => {
            // Parse attachments safely
            const attachmentsList = parseAttachments(envio.attachments);
            
            return (
              <Card key={envio.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>{envio.template?.nome || 'Template removido'}</CardTitle>
                    <Badge className={getStatusColor(envio.status)}>
                      {envio.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Enviado em {format(new Date(envio.data_envio), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Destinatário</span>
                      <span className="font-medium">{envio.contato?.nome || 'Contato removido'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span>{envio.contato?.email || 'Email não disponível'}</span>
                    </div>
                    {envio.erro && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-500">Erro</span>
                        <span className="text-red-500">{envio.erro}</span>
                      </div>
                    )}
                    {attachmentsList && attachmentsList.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Anexos</span>
                        <span>{attachmentsList.length} arquivo(s)</span>
                      </div>
                    )}
                  </div>
                  
                  {(envio.status === 'erro' || envio.erro) && (
                    <div className="mt-4 flex justify-end">
                      <Button 
                        size="sm" 
                        onClick={() => handleResend(envio.id)}
                        disabled={sending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Reenviar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
