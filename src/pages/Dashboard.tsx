
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line } from 'recharts';
import { Calendar, Mail, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalContatos: 0,
    totalTemplates: 0,
    totalEnvios: 0,
    totalAgendamentos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

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
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const emptyState = !stats.totalContatos && !stats.totalTemplates && !stats.totalEnvios && !stats.totalAgendamentos;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
                  <CardTitle>Envios por Canal</CardTitle>
                  <CardDescription>
                    Comparativo de mensagens enviadas via email e WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      Dados de envio serão exibidos conforme você realizar envios
                    </p>
                  </div>
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
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>
              Visualize os envios programados para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalAgendamentos === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Nenhum envio agendado. Agende seu primeiro envio na página de agendamentos.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Agendamentos will be loaded here when implemented */}
                <div className="p-4 text-center text-muted-foreground">
                  Carregando agendamentos...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status dos Envios Recentes</CardTitle>
            <CardDescription>
              Resumo dos últimos envios realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalEnvios === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Nenhum envio realizado ainda. Comece enviando sua primeira mensagem.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Recent sends will be loaded here when implemented */}
                <div className="p-4 text-center text-muted-foreground">
                  Carregando envios recentes...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
