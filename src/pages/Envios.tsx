
import { useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useEnvios } from '@/hooks/useEnvios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

export default function Envios() {
  const { envios, loading, fetchEnvios } = useEnvios();

  useEffect(() => {
    fetchEnvios();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Histórico de Envios</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando histórico...</p>
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
        <div className="border rounded-md">
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
                    {format(new Date(envio.data_envio), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {envio.contato?.nome || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {envio.template?.nome || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {envio.template?.canal || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span className={
                      envio.status === 'sucesso' 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }>
                      {envio.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
