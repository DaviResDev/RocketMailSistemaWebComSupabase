
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Mail, Users, Zap, Server } from 'lucide-react';

interface EnvioStatusAlertProps {
  tipo: 'individual' | 'lote';
  status: 'sucesso' | 'falha' | 'processando';
  detalhes: {
    total?: number;
    sucesso?: number;
    falha?: number;
    destinatario?: string;
    assunto?: string;
    duracao?: number;
    provider?: string;
    taxaSucesso?: string;
    method?: string;
    host?: string;
  };
  onClose?: () => void;
}

export function EnvioStatusAlert({ tipo, status, detalhes, onClose }: EnvioStatusAlertProps) {
  const getIcon = () => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'falha':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processando':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'sucesso':
        return 'default';
      case 'falha':
        return 'destructive';
      case 'processando':
        return 'default';
    }
  };

  const getBackgroundClass = () => {
    switch (status) {
      case 'sucesso':
        return 'bg-gradient-to-r from-green-50 to-green-100 border-green-300';
      case 'falha':
        return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300';
      case 'processando':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300';
    }
  };

  const getTitulo = () => {
    if (tipo === 'individual') {
      switch (status) {
        case 'sucesso':
          return '✅ Email enviado com sucesso via SMTP!';
        case 'falha':
          return '❌ Falha no envio do Email via SMTP';
        case 'processando':
          return '📤 Enviando Email via SMTP...';
      }
    } else {
      switch (status) {
        case 'sucesso':
          return '🎯 Envio em Lote via SMTP Concluído!';
        case 'falha':
          return '⚠️ Envio em Lote via SMTP com Problemas';
        case 'processando':
          return '🚀 Processando Envio em Lote via SMTP...';
      }
    }
  };

  const getProviderDisplay = () => {
    if (detalhes.method === 'SMTP' || detalhes.provider) {
      const providerName = detalhes.provider || 'SMTP';
      const hostDisplay = detalhes.host ? ` (${detalhes.host})` : '';
      return `Via SMTP${hostDisplay}`;
    }
    return 'Via Sistema';
  };

  return (
    <Alert variant={getVariant()} className={`${getBackgroundClass()} border-2 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getIcon()}
          
          <div className="flex-1">
            <AlertTitle className="text-lg font-bold mb-2">
              {getTitulo()}
            </AlertTitle>
            
            <AlertDescription>
              <div className="space-y-2">
                {/* Detalhes do envio individual */}
                {tipo === 'individual' && (
                  <div className="space-y-1">
                    {detalhes.destinatario && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Para:</span> {detalhes.destinatario}
                      </div>
                    )}
                    {detalhes.assunto && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Assunto:</span> {detalhes.assunto}
                      </div>
                    )}
                    {detalhes.duracao && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium">Duração:</span> {detalhes.duracao}ms
                      </div>
                    )}
                  </div>
                )}

                {/* Detalhes do envio em lote */}
                {tipo === 'lote' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {detalhes.total && (
                      <div className="text-center bg-white/70 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xl font-bold">{detalhes.total}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                    )}
                    
                    {detalhes.sucesso !== undefined && (
                      <div className="text-center bg-white/70 rounded-lg p-2">
                        <div className="text-xl font-bold text-green-600">{detalhes.sucesso}</div>
                        <div className="text-xs text-muted-foreground">Sucesso</div>
                      </div>
                    )}
                    
                    {detalhes.falha !== undefined && (
                      <div className="text-center bg-white/70 rounded-lg p-2">
                        <div className="text-xl font-bold text-red-600">{detalhes.falha}</div>
                        <div className="text-xs text-muted-foreground">Falhas</div>
                      </div>
                    )}
                    
                    {detalhes.taxaSucesso && (
                      <div className="text-center bg-white/70 rounded-lg p-2">
                        <div className="text-xl font-bold text-blue-600">{detalhes.taxaSucesso}%</div>
                        <div className="text-xs text-muted-foreground">Taxa</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Provider e informações adicionais */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="bg-white/80">
                    <Server className="h-3 w-3 mr-1" />
                    {getProviderDisplay()}
                  </Badge>
                  <Badge variant="outline" className="bg-white/80">
                    {tipo === 'individual' ? 'Envio Individual' : 'Envio em Lote'}
                  </Badge>
                  <Badge variant="outline" className="bg-white/80">
                    {new Date().toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-2"
            aria-label="Fechar"
          >
            ✕
          </button>
        )}
      </div>
    </Alert>
  );
}
