import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Cell } from 'recharts';
import { Calendar, Mail, MessageSquare, Users, Clock, RefreshCcw, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMetrics } from '@/hooks/useMetrics';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalContatos: 0,
    totalTemplates: 0,
    totalEnvios: 0,
    totalAgendamentos: 0
  });
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [recentEnvios, setRecentEnvios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { metrics, loading: metricsLoading, fetchMetrics } = useMetrics();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const [contatos, templates, envios, agendamentos] = await Promise.all([
        supabase.from('contatos').select('id').eq('user_id', user.id),
        supabase.from('templates').select('id').eq('user_id', user.id),
        supabase.from('envios').select('id').eq('user_id', user.id),
        supabase.from('agendamentos').select('id').eq('user_id', user.id)
      ]);

      setStats({
        totalContatos: contatos.data?.length || 0,
        totalTemplates: templates.data?.length || 0,
        totalEnvios: envios.data?.length || 0,
        totalAgendamentos: agendamentos.data?.length || 0
      });
      
      await fetchRecentData();
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentData = async () => {
    if (!user) return;

    try {
      // Fetch pending schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          contato:contatos(nome, email),
          template:templates(nome)
        `)
        .eq('status', 'pendente')
        .order('data_envio', { ascending: true })
        .limit(5);

      if (scheduleError) throw scheduleError;
      setPendingSchedules(scheduleData || []);

      // Fetch recent envios - now showing all statuses including success
      const { data: envioData, error: enviosError } = await supabase
        .from('envios')
        .select(`
          *,
          contato:contatos(nome, email),
          template:templates(nome)
        `)
        .order('data_envio', { ascending: false })
        .limit(5);

      if (enviosError) throw enviosError;
      setRecentEnvios(envioData || []);
    } catch (error) {
      console.error('Erro ao carregar dados recentes:', error);
    }
  };
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    
    fetchData();
    
    // Set up real-time subscription for updates
    const enviosChannel = supabase
      .channel('dashboard_envios_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'envios' },
        () => fetchRecentData()
      )
      .subscribe();
      
    const agendamentosChannel = supabase
      .channel('dashboard_agendamentos_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        () => fetchRecentData()
      )
      .subscribe();
    
    // Clean up subscriptions when component unmounts
    return () => {
      supabase.removeChannel(enviosChannel);
      supabase.removeChannel(agendamentosChannel);
    };
  }, [user]);

  const handleRefresh = () => {
    fetchData();
    fetchMetrics();
    toast.info('Atualizando dados do dashboard...');
  };

  // Prepare chart data for status distribution
  const statusChartData = metrics.enviolPorStatus.map(item => ({
    name: item.status === 'entregue' ? 'Entregues' : 
          item.status === 'pendente' ? 'Pendentes' : 'Falhas',
    value: item.count
  }));

  // Define colors for the bar chart based on status
  const getBarColor = (status: string) => {
    if (status === 'Entregues') return "#22c55e";
    if (status === 'Pendentes') return "#f59e0b";
    return "#ef4444";
  };

  const emptyState = !stats.totalContatos && !stats.totalTemplates && !stats.totalEnvios && !stats.totalAgendamentos;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            title="Atualizar dados"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Período:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContatos}</div>
            <p className="text-xs text-muted-foreground">
              Total de contatos cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              Total de templates criados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Envios</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnvios}</div>
            <p className="text-xs text-muted-foreground">
              Total de mensagens enviadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgendamentos}</div>
            <p className="text-xs text-muted-foreground">
              Total de envios agendados
            </p>
          </CardContent>
        </Card>
      </div>
      
      {emptyState ? (
        <Card className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Bem-vindo ao seu Dashboard!</h3>
            <p className="text-muted-foreground mb-4">
              Comece adicionando contatos e criando templates para visualizar suas estatísticas aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.totalEnvios > 0 ? (
            <>
              <Card className="col-span-2 md:col-span-1">
                <CardHeader>
                  <CardTitle>Status dos Envios</CardTitle>
                  <CardDescription>
                    Distribuição dos envios por status
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Quantidade"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        Dados de envio serão exibidos conforme você realizar envios
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="col-span-2 md:col-span-1">
                <CardHeader>
                  <CardTitle>Engajamento</CardTitle>
                  <CardDescription>
                    Taxa de aberturas e cliques ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      Métricas de engajamento serão exibidas conforme suas mensagens forem abertas
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>
                Visualize os envios programados para os próximos dias
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/agendamentos')}>Ver todos</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : pendingSchedules.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Nenhum envio agendado. Agende seu primeiro envio na página de agendamentos.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingSchedules.map((schedule) => (
                  <div key={schedule.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{schedule.template?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Para: {schedule.contato?.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {format(new Date(schedule.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(schedule.data_envio), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Status dos Envios Recentes</CardTitle>
              <CardDescription>
                Resumo dos últimos envios realizados
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/envios')}>Ver todos</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentEnvios.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Nenhum envio realizado ainda. Comece enviando sua primeira mensagem.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentEnvios.map((envio) => (
                  <div key={envio.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{envio.template?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Para: {envio.contato?.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {format(new Date(envio.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <div className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center ${
                        envio.status === 'entregue' ? 'bg-green-100 text-green-800' : 
                        envio.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {envio.status === 'entregue' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {envio.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
