
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface SmtpStatusIndicatorProps {
  useSmtp: boolean;
  hasSmtpSettings: boolean;
  hasResendConfig: boolean;
}

export function SmtpStatusIndicator({ useSmtp, hasSmtpSettings, hasResendConfig }: SmtpStatusIndicatorProps) {
  if (useSmtp && hasSmtpSettings) {
    return (
      <Alert className="bg-green-50 text-green-800 border-green-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>SMTP Configurado:</strong> Emails serão enviados através do seu servidor SMTP personalizado.
        </AlertDescription>
      </Alert>
    );
  }

  if (useSmtp && !hasSmtpSettings) {
    return (
      <Alert className="bg-red-50 text-red-800 border-red-200">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>SMTP Incompleto:</strong> Configure todas as informações SMTP para usar este método de envio.
        </AlertDescription>
      </Alert>
    );
  }

  if (!useSmtp && hasResendConfig) {
    return (
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Resend Ativo:</strong> Emails serão enviados através do serviço Resend.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Configuração Necessária:</strong> Configure SMTP ou verifique se o Resend está funcionando.
      </AlertDescription>
    </Alert>
  );
}
