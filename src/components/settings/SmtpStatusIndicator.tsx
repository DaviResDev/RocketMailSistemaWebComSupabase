
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SmtpStatusIndicatorProps {
  useSmtp: boolean;
  hasSmtpSettings: boolean;
}

export function SmtpStatusIndicator({ useSmtp, hasSmtpSettings }: SmtpStatusIndicatorProps) {
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
          <strong>SMTP Incompleto:</strong> Configure todas as informações SMTP para enviar emails.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>SMTP Necessário:</strong> Configure seu servidor SMTP para enviar emails.
      </AlertDescription>
    </Alert>
  );
}
