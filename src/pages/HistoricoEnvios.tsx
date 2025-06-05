
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Mail, Clock, CheckCircle, XCircle, Filter, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HistoricoEnvio {
  id: string;
  remetente_nome: string;
  remetente_email: string;
  destinatario_nome: string;
  destinatario_email: string;
  status: 'entregue' | 'falhou';
  template_nome: string | null;
  tipo_envio: 'imediato' | 'agendado';
  mensagem_erro: string | null;
  data_envio: string;
}

export default function HistoricoEnvios() {
  const [historico, setHistorico] = useState<HistoricoEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHistorico();
    }
  }, [user]);

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('envios_historico')
        .select('*')
        .eq('user_id', user?.id)
        .order('data_envio', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de envios');
    } finally {
      setLoading(false);
    }
  };

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
    if (status === 'entregue') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Entregue
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Falhou
      </Badge>
    );
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
    entregues: historico.filter(h => h.status === 'entregue').length,
    falhas: historico.filter(h => h.status === 'falhou').length,
    imediatos: historico.filter(h => h.tipo_envio === 'imediato').length,
    agendados: historico.filter(h => h.tipo_envio === 'agendado').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Envios</h1>
        <p className="text-gray-600">Acompanhe todos os emails enviados pela plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entregues</p>
                <p className="text-2xl font-bold text-green-600">{stats.entregues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{stats.falhas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Imediatos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.imediatos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Agendados</p>
                <p className="text-2xl font-bold text-purple-600">{stats.agendados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
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
          <CardTitle>Histórico de Envios ({filteredHistorico.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistorico.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum envio encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Remetente</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorico.map((envio) => (
                    <TableRow key={envio.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(envio.data_envio), 'dd/MM/yyyy')}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(envio.data_envio), 'HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{envio.destinatario_nome}</p>
                          <p className="text-sm text-gray-600">{envio.destinatario_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{envio.remetente_nome}</p>
                          <p className="text-sm text-gray-600">{envio.remetente_email}</p>
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
