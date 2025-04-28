
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, MessageSquare } from 'lucide-react';
import { useEnvios } from '@/hooks/useEnvios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Envios() {
  const { envios, loading, fetchEnvios } = useEnvios();

  useEffect(() => {
    fetchEnvios();
  }, []);

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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
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
