
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Mail, AlertCircle, InfoIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

export function SettingsInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5 text-blue-500" />
          Configuração de Domínio para Emails
        </CardTitle>
        <CardDescription>
          Como garantir a melhor entregabilidade dos seus emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-4">
            O DisparoPro usa o serviço Resend para garantir alta entregabilidade dos seus emails.
            Você pode usar o sistema imediatamente de duas formas:
          </p>
          
          <div className="space-y-3 mt-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Envio Básico (já funcionando)</p>
                <p className="text-sm text-muted-foreground">
                  Seus emails serão enviados automaticamente com o remetente do sistema DisparoPro, 
                  mas as respostas chegarão no seu email cadastrado.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Envio Personalizado (recomendado)</p>
                <p className="text-sm text-muted-foreground">
                  Para usar seu próprio domínio no email remetente e melhorar a entregabilidade, 
                  é necessário verificar seu domínio no Resend.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Usando um domínio verificado, sua taxa de entrega será muito maior e menos emails cairão na caixa de spam.
          </AlertDescription>
        </Alert>
        
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Como verificar seu domínio no Resend:
          </h3>
          <ol className="space-y-2 ml-4 list-decimal">
            <li>Crie uma conta gratuita no Resend</li>
            <li>Adicione e verifique seu domínio de email</li>
            <li>Volte ao DisparoPro e use seu email com domínio verificado</li>
          </ol>
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex gap-2 items-center"
              onClick={() => window.open('https://resend.com/signup', '_blank')}
            >
              Criar conta no Resend
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex gap-2 items-center"
              onClick={() => window.open('https://resend.com/domains', '_blank')}
            >
              Verificar domínio
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Se você não tiver um domínio próprio, não se preocupe. 
          O DisparoPro continuará enviando seus emails usando o sistema padrão, 
          mas recomendamos verificar periodicamente a pasta de spam dos destinatários.
        </p>
      </CardContent>
    </Card>
  );
}
