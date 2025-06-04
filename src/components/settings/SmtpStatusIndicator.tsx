
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface SmtpStatusIndicatorProps {
  useSmtp: boolean;
  hasSmtpSettings: boolean;
  hasResendConfig: boolean;
}

export function SmtpStatusIndicator({ useSmtp, hasSmtpSettings, hasResendConfig }: SmtpStatusIndicatorProps) {
  return (
    <Alert className="bg-gray-50 text-gray-800 border-gray-200">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>Funcionalidade de Envio Desabilitada:</strong> O sistema está configurado apenas para gerenciamento de templates e contatos. O envio de emails foi removido.
      </AlertDescription>
    </Alert>
  );
}
