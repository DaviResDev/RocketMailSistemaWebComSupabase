
import React, { useEffect } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { SecuritySettingsForm } from '@/components/settings/SecuritySettingsForm';
import { AccountDeletionForm } from '@/components/settings/AccountDeletionForm';
import { SmtpStatusIndicator } from '@/components/settings/SmtpStatusIndicator';
import { SmtpConfiguracaoForm } from '@/components/settings/SmtpConfiguracaoForm';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const hasSmtpSettings = settings?.smtp_host && settings?.email_usuario && settings?.smtp_pass;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      
      <SmtpStatusIndicator 
        useSmtp={true}
        hasSmtpSettings={!!hasSmtpSettings}
      />
      
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="smtp-advanced">SMTP Avançado</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileForm
            onSave={() => {
              toast.success('Perfil atualizado com sucesso!');
            }}
          />
        </TabsContent>

        <TabsContent value="smtp">
          <SettingsForm
            onSave={() => {
              toast.success('Configurações SMTP atualizadas com sucesso!');
            }}
          />
        </TabsContent>

        <TabsContent value="smtp-advanced">
          <SmtpConfiguracaoForm />
        </TabsContent>
        
        <TabsContent value="security">
          <SecuritySettingsForm />
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
