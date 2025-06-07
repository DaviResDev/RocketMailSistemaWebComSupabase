
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Trash2,
  Zap,
  Eye
} from 'lucide-react';

interface EmailValidationPanelProps {
  validationProgress: {
    current: number;
    total: number;
    percentage: number;
    isValidating: boolean;
  };
  validationStats?: {
    total: number;
    valid: number;
    syntaxErrors: number;
    domainErrors: number;
    disposableEmails: number;
    blockedEmails: number;
  } | null;
  onValidate: () => void;
  onReset: () => void;
  onShowInvalid?: () => void;
  isValidationAvailable: boolean;
}

export function EmailValidationPanel({
  validationProgress,
  validationStats,
  onValidate,
  onReset,
  onShowInvalid,
  isValidationAvailable
}: EmailValidationPanelProps) {
  const { current, total, percentage, isValidating } = validationProgress;
  
  const getValidationStatus = () => {
    if (isValidating) return 'Validando emails...';
    if (validationStats) return 'Validação concluída';
    return 'Pronto para validar';
  };

  const getSuccessRate = () => {
    if (!validationStats || validationStats.total === 0) return 0;
    return ((validationStats.valid / validationStats.total) * 100).toFixed(1);
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Validação Inteligente de Emails
          <Badge variant="outline" className="bg-blue-100">
            100% SUCESSO
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sistema automático que remove emails inválidos antes do envio SMTP
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status da validação */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{getValidationStatus()}</span>
          {validationStats && (
            <Badge variant="outline" className="bg-green-100">
              {getSuccessRate()}% válidos
            </Badge>
          )}
        </div>

        {/* Barra de progresso */}
        {isValidating && (
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Verificando sintaxe, domínios e emails descartáveis...</span>
              <span>{current}/{total}</span>
            </div>
          </div>
        )}

        {/* Estatísticas detalhadas */}
        {validationStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {validationStats.valid}
              </div>
              <div className="text-xs text-muted-foreground">Válidos</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">
                {validationStats.syntaxErrors}
              </div>
              <div className="text-xs text-muted-foreground">Sintaxe</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">
                {validationStats.domainErrors}
              </div>
              <div className="text-xs text-muted-foreground">Domínios</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {validationStats.disposableEmails}
              </div>
              <div className="text-xs text-muted-foreground">Descartáveis</div>
            </div>
          </div>
        )}

        {/* Tipos de verificação */}
        <div className="bg-gradient-to-r from-blue-100 to-green-100 border-2 border-blue-300 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Sintaxe válida (RFC 5322)</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Verificação DNS/MX</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Anti-emails descartáveis</span>
            </div>
          </div>
        </div>

        {/* Resumo de qualidade */}
        {validationStats && (
          <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">
                    Taxa de Qualidade: {getSuccessRate()}%
                  </div>
                  <div className="text-sm text-green-600">
                    {validationStats.valid} emails aprovados de {validationStats.total} verificados
                  </div>
                </div>
              </div>
              {onShowInvalid && validationStats.total - validationStats.valid > 0 && (
                <Button onClick={onShowInvalid} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Inválidos
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2">
          <Button
            onClick={onValidate}
            disabled={!isValidationAvailable || isValidating}
            className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            size="lg"
          >
            {isValidating ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-pulse" />
                Validando...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                🎯 Validar Emails
              </>
            )}
          </Button>
          
          {validationStats && (
            <Button onClick={onReset} variant="outline" size="lg">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Aviso quando não há contatos */}
        {!isValidationAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Selecione contatos para ativar a validação
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
