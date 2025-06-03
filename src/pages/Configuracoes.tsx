
import React, { useEffect } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { SecuritySettingsForm } from '@/components/settings/SecuritySettingsForm';
import { AccountDeletionForm } from '@/components/settings/AccountDeletionForm';
import { SmtpStatusIndicator } from '@/components/settings/SmtpStatusIndicator';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { SettingsInstructions } from '@/components/settings/SettingsInstructions';

export default function Configuracoes() {
  const { fetchSettings, settings, loading, error } = useSettings();

  useEffect(() => {
    console.log("Configuracoes page - Fetching settings");
    fetchSettings();
  }, [fetchSettings]);

  // Retry loading if there was an error
  const handleRetry = () => {
    toast.info('Recarregando configurações...');
    fetchSettings();
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Ocorreu um erro ao carregar as configurações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button 
              className="mt-4"
              onClick={handleRetry}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !settings) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  // Check configuration status
  const hasSmtpSettings = !!(settings?.email_smtp && settings?.email_usuario && settings?.email_senha);
  const hasResendConfig = true; // Assuming Resend is always available

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure um sistema híbrido de email: SMTP para controle total + Resend como fallback para máxima confiabilidade.
        </AlertDescription>
      </Alert>

      {settings && (
        <SmtpStatusIndicator 
          useSmtp={settings.use_smtp || false}
          hasSmtpSettings={hasSmtpSettings}
          hasResendConfig={hasResendConfig}
        />
      )}
      
      <Tabs defaultValue="email">
        <TabsList className="mb-4">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>
        
        <TabsContent value="email">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <SettingsForm
                onSave={() => {
                  toast.success('Configurações de email atualizadas com sucesso!');
                }}
              />
            </div>
            <div>
              <SettingsInstructions />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <SecuritySettingsForm />
        </TabsContent>
        
        <TabsContent value="profile">
          <ProfileForm
            onSave={() => {
              toast.success('Perfil atualizado com sucesso!');
            }}
          />
        </TabsContent>
        
        <TabsContent value="account">
          <div className="space-y-6">
            <AccountDeletionForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
