
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useScheduledEmailsMonitoring } from '@/hooks/useScheduledEmailsMonitoring';

export function ScheduledEmailsMonitor() {
  const { 
    stats, 
    loading, 
    processing, 
    fetchStats, 
    triggerManualProcessing, 
    retryFailedSchedules 
  } = useScheduledEmailsMonitoring();

  useEffect(() => {
    fetchStats();
    
    // Atualizar estatísticas a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Monitor de Emails Agendados
            </CardTitle>
            <CardDescription>
              Status dos emails agendados e processamento automático
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendente}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Enviados</p>
                <p className="text-2xl font-bold text-green-600">{stats.enviado}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats.erro}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status do sistema */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Status do Sistema</h3>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
              Ativo
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Cron job executando a cada minuto</p>
            <p>• Processamento automático ativo</p>
            <p>• SMTP integrado para envios</p>
          </div>
        </div>

        {/* Ações manuais */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={triggerManualProcessing}
            disabled={processing || loading}
            size="sm"
          >
            <Play className={`h-4 w-4 mr-2 ${processing ? 'animate-pulse' : ''}`} />
            {processing ? 'Processando...' : 'Processar Agora'}
          </Button>
          
          {stats && stats.erro > 0 && (
            <Button
              variant="outline"
              onClick={retryFailedSchedules}
              disabled={loading}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reprocessar Erros ({stats.erro})
            </Button>
          )}
        </div>

        {/* Informações importantes */}
        <div className="text-xs text-muted-foreground border-l-4 border-blue-200 pl-3">
          <p className="font-medium mb-1">ℹ️ Informações:</p>
          <ul className="space-y-1">
            <li>• Os emails são processados automaticamente a cada minuto</li>
            <li>• Emails agendados usam as configurações SMTP do usuário</li>
            <li>• Falhas são registradas e podem ser reprocessadas</li>
            <li>• O sistema processa até 50 agendamentos por execução</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
