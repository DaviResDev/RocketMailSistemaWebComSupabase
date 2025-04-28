
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, RefreshCw } from 'lucide-react';

interface WhatsAppQrCodeProps {
  onConnect?: () => void;
}

export function WhatsAppQrCode({ onConnect }: WhatsAppQrCodeProps) {
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const generateQrCode = () => {
    setLoading(true);
    
    // Simulação de geração de QR Code
    // Em uma implementação real, isso viria da API do WhatsApp Business
    setTimeout(() => {
      setQrCodeUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=whatsapp-connection-demo');
      setLoading(false);
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vincular WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCodeUrl ? (
          <div className="flex flex-col items-center space-y-4">
            <img 
              src={qrCodeUrl} 
              alt="QR Code para conexão do WhatsApp" 
              className="border rounded-lg p-2"
              width={200}
              height={200}
            />
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no seu celular, toque em Menu ou Configurações e selecione WhatsApp Web.
              <br />
              Aponte seu celular para esta tela para capturar o código QR.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setQrCodeUrl(null)}
              >
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateQrCode}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar novo código
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-8 border rounded-lg flex items-center justify-center">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
            <Button 
              onClick={generateQrCode} 
              disabled={loading}
            >
              {loading ? 'Gerando...' : 'Gerar QR Code'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
