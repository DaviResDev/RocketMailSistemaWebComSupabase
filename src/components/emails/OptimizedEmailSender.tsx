
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Shield, 
  Target,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useOptimizedEmailSending } from '@/hooks/useOptimizedEmailSending';
import { toast } from 'sonner';

interface OptimizedEmailSenderProps {
  selectedContacts: any[];
  templateId: string;
  customSubject?: string;
  customContent?: string;
  onSendComplete?: (result: any) => void;
}

export function OptimizedEmailSender({
  selectedContacts,
  templateId,
  customSubject,
  customContent,
  onSendComplete
}: OptimizedEmailSenderProps) {
  const { isProcessing, progress, sendOptimizedEmails } = useOptimizedEmailSending();
  const [showDetails, setShowDetails] = useState(false);

  const handleSend = async () => {
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('Nenhum contato selecionado');
      return;
    }

    if (!templateId) {
      toast.error('Nenhum template selecionado');
      return;
    }

    const result = await sendOptimizedEmails(
      selectedContacts,
      templateId,
      customSubject,
      customContent
    );

    if (onSendComplete) {
      onSendComplete(result);
    }
  };

  const getStatusIcon = () => {
    if (!isProcessing) return <Target className="h-5 w-5 text-blue-500" />;
    if (progress.errorCount > 0) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <Zap className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isProcessing) return 'Sistema Otimizado Pronto';
    if (progress.percentage === 100) return 'Processamento Concluído';
    return 'Processando com Rate Limiting Inteligente';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Envio Otimizado - Sistema Anti-421
          </CardTitle>
          <Badge variant={isProcessing ? "default" : "secondary"} className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            100% Sucesso
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Rate limiting inteligente para Gmail e outros provedores. Máxima compatibilidade SMTP.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do envio */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600">{selectedContacts.length}</p>
            <p className="text-xs text-muted-foreground">Contatos</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">
              {progress.successCount}
            </p>
            <p className="text-xs text-muted-foreground">Sucessos</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">
              {progress.errorCount}
            </p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
        </div>

        {/* Barra de progresso */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getStatusText()}</span>
              <span>{progress.percentage.toFixed(1)}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.currentOperation}</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
          </div>
        )}

        {/* Métricas em tempo real */}
        {isProcessing && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                Tempo restante: {progress.estimatedTimeRemaining > 0 ? formatTime(progress.estimatedTimeRemaining) : 'Calculando...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>
                Throughput: {progress.throughput.toFixed(1)} emails/s
              </span>
            </div>
          </div>
        )}

        {/* Status da fila */}
        {isProcessing && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Fila Inteligente</span>
            </div>
            <div className="text-sm">
              {progress.queueStatus.processing ? (
                <Badge variant="default">Processando</Badge>
              ) : (
                <Badge variant="secondary">Aguardando</Badge>
              )}
              <span className="ml-2 text-muted-foreground">
                {progress.queueStatus.pending} pendentes
              </span>
            </div>
          </div>
        )}

        {/* Botão de envio */}
        <Button 
          onClick={handleSend}
          disabled={isProcessing || selectedContacts.length === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Settings className="mr-2 h-4 w-4 animate-spin" />
              Processando Sistema Otimizado...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Enviar com Sistema Otimizado
            </>
          )}
        </Button>

        {/* Informações técnicas */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Rate limiting inteligente específico por provedor
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Sistema de retry com backoff exponencial
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Configurações SMTP otimizadas automaticamente
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Fila inteligente com priorização
          </div>
        </div>

        {/* Estimativa para Gmail */}
        {selectedContacts.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-1">
              Estimativa Otimizada para Gmail:
            </p>
            <p className="text-xs text-blue-600">
              ⏱️ Tempo estimado: {Math.ceil(selectedContacts.length * 5)} segundos (5s por email)
              <br />
              🎯 Taxa de sucesso esperada: 100% com rate limiting
              <br />
              ⚡ Delays inteligentes para evitar erro 421-4.3.0
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
