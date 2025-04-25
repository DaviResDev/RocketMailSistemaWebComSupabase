
import { useState } from 'react';
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

// Mock data for the dashboard
const metricsData = [
  { name: 'Jan', emails: 65, whatsapp: 28, aberturas: 40, cliques: 24 },
  { name: 'Fev', emails: 59, whatsapp: 48, aberturas: 38, cliques: 26 },
  { name: 'Mar', emails: 80, whatsapp: 40, aberturas: 45, cliques: 35 },
  { name: 'Abr', emails: 81, whatsapp: 47, aberturas: 50, cliques: 40 },
  { name: 'Mai', emails: 56, whatsapp: 65, aberturas: 42, cliques: 28 },
  { name: 'Jun', emails: 55, whatsapp: 58, aberturas: 40, cliques: 29 },
  { name: 'Jul', emails: 40, whatsapp: 44, aberturas: 35, cliques: 20 },
];

const statusData = [
  { name: 'Enviados', value: 540 },
  { name: 'Entregues', value: 520 },
  { name: 'Lidos', value: 380 },
  { name: 'Clicados', value: 120 },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');
  const { user } = useAuth();

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
            <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              +20.1% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Aberturas</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">621</div>
            <p className="text-xs text-muted-foreground">
              +10.5% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cliques</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">289</div>
            <p className="text-xs text-muted-foreground">
              +18.2% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">573</div>
            <p className="text-xs text-muted-foreground">
              +7.4% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Envios por Canal</CardTitle>
            <CardDescription>
              Comparativo de mensagens enviadas via email e WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricsData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="emails" fill="#3b82f6" name="Email" />
                <Bar dataKey="whatsapp" fill="#10b981" name="WhatsApp" />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={metricsData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="aberturas" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  name="Aberturas"
                />
                <Line 
                  type="monotone" 
                  dataKey="cliques" 
                  stroke="#82ca9d" 
                  name="Cliques" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>
              Visualize os envios programados para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Campanha de {i === 0 ? 'Black Friday' : i === 1 ? 'Novidades' : 'Aniversário'}</div>
                    <div className="text-sm text-muted-foreground">
                      {i === 0 ? 'E-mail' : i === 1 ? 'WhatsApp' : 'E-mail + WhatsApp'} • {i === 0 ? '120' : i === 1 ? '85' : '230'} destinatários
                    </div>
                  </div>
                  <div className="text-sm">
                    {i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : 'Em 2 dias'}, {i === 0 ? '15:30' : i === 1 ? '10:00' : '08:45'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status dos Envios Recentes</CardTitle>
            <CardDescription>
              Resumo dos últimos 100 envios realizados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {statusData.map((item, i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div className="font-medium">{item.name}</div>
                  <div>
                    <div className="text-right font-bold">{item.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((item.value / statusData[0].value) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
