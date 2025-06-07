import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Mail, Clock, CheckCircle, XCircle, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useHistoricoEnvios } from '@/hooks/useHistoricoEnvios';
import { useState } from 'react';

export default function HistoricoEnvios() {
  const { historico, loading, fetchHistorico } = useHistoricoEnvios();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  const filteredHistorico = historico.filter(envio => {
    const matchesSearch = 
      envio.destinatario_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envio.destinatario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envio.remetente_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (envio.template_nome && envio.template_nome.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || envio.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || envio.tipo_envio === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'erro':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      case 'pendente':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'agendado':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Calendar className="w-3 h-3 mr-1" />
            Agendado
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'imediato') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Mail className="w-3 h-3 mr-1" />
          Imediato
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 mr-1" />
        Agendado
      </Badge>
    );
  };

  const stats = {
    total: historico.length,
    enviados: historico.filter(h => h.status === 'enviado').length,
    erros: historico.filter(h => h.status === 'erro').length,
    pendentes: historico.filter(h => h.status === 'pendente').length,
    agendados: historico.filter(h => h.status === 'agendado').length,
    cancelados: historico.filter(h => h.status === 'cancelado').length,
    imediatos: historico.filter(h => h.tipo_envio === 'imediato').length,
    agendados_tipo: historico.filter(h => h.tipo_envio === 'agendado').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Histórico de Envios</h1>
        <p className="text-foreground">Acompanhe todos os emails enviados pela plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats.erros}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Imediatos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.imediatos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground">Agendados</p>
                <p className="text-2xl font-bold text-purple-600">{stats.agendados_tipo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por email, nome ou template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="imediato">Imediato</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Envios ({filteredHistorico.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistorico.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-foreground">Nenhum envio encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Data/Hora</TableHead>
                    <TableHead className="text-foreground">Destinatário</TableHead>
                    <TableHead className="text-foreground">Remetente</TableHead>
                    <TableHead className="text-foreground">Template</TableHead>
                    <TableHead className="text-foreground">Tipo</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorico.map((envio) => (
                    <TableRow key={envio.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-foreground">
                              {format(new Date(envio.data_envio), 'dd/MM/yyyy')}
                            </p>
                            <p className="text-sm text-foreground">
                              {format(new Date(envio.data_envio), 'HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{envio.destinatario_nome}</p>
                          <p className="text-sm text-foreground">{envio.destinatario_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{envio.remetente_nome}</p>
                          <p className="text-sm text-foreground">{envio.remetente_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {envio.template_nome ? (
                          <Badge variant="outline">{envio.template_nome}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getTipoBadge(envio.tipo_envio)}</TableCell>
                      <TableCell>{getStatusBadge(envio.status)}</TableCell>
                      <TableCell>
                        {envio.mensagem_erro ? (
                          <span className="text-red-600 text-sm">{envio.mensagem_erro}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
