
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Zap, Mail, Settings, Clock, Wifi, WifiOff } from 'lucide-react';

interface SmtpStatusIndicatorProps {
  useSmtp: boolean;
  hasSmtpSettings: boolean;
  hasResendConfig: boolean;
}

export function SmtpStatusIndicator({ useSmtp, hasSmtpSettings, hasResendConfig }: SmtpStatusIndicatorProps) {
  if (!useSmtp) {
    return (
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Modo Resend:</strong> Todos os emails serão enviados via Resend.
          {hasResendConfig ? " Configuração válida." : " Configure a chave API do Resend."}
        </AlertDescription>
      </Alert>
    );
  }

  if (useSmtp && hasSmtpSettings && hasResendConfig) {
    return (
      <Alert className="bg-green-50 text-green-800 border-green-200">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema Híbrido Ativo:</strong> Enviará via seu SMTP configurado primeiro, 
          com fallback automático para Resend em caso de falha. Máxima confiabilidade garantida!
        </AlertDescription>
      </Alert>
    );
  }

  if (useSmtp && hasSmtpSettings && !hasResendConfig) {
    return (
      <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
        <Wifi className="h-4 w-4" />
        <AlertDescription>
          <strong>SMTP Configurado:</strong> Enviará via seu SMTP, mas sem fallback. 
          Recomendamos configurar Resend como backup para maior confiabilidade.
        </AlertDescription>
      </Alert>
    );
  }

  if (useSmtp && !hasSmtpSettings) {
    return (
      <Alert className="bg-red-50 text-red-800 border-red-200">
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuração Incompleta:</strong> SMTP ativado mas não configurado. 
          Complete as configurações SMTP abaixo ou desative para usar apenas Resend.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
