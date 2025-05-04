
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Save, Loader2, ShieldCheck } from 'lucide-react';

export function SecuritySettingsForm() {
  const { settings, saveSettings, loading } = useSettings();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (settings) {
      setTwoFactorEnabled(settings.two_factor_enabled || false);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings || !user) {
      toast.error('Você precisa estar logado para salvar configurações de segurança');
      return;
    }
    
    // Only send the update if the value actually changed
    if (twoFactorEnabled !== settings.two_factor_enabled) {
      try {
        setIsSubmitting(true);
        
        // Update the settings with the new 2FA value
        await saveSettings({
          ...settings,
          two_factor_enabled: twoFactorEnabled
        });
        
        toast.success('Configurações de segurança atualizadas com sucesso');
      } catch (error: any) {
        console.error('Error saving security settings:', error);
        toast.error(`Erro ao salvar configurações de segurança: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando configurações de segurança...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Segurança da Conta</CardTitle>
          <CardDescription>
            Gerencie as configurações de segurança da sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor" className="text-base">Autenticação de dois fatores (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança à sua conta
              </p>
            </div>
            <Switch
              id="two-factor"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
              disabled={isSubmitting}
            />
          </div>
          
          {twoFactorEnabled && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Como funciona a autenticação de dois fatores</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Com a 2FA ativada, além da senha, você precisará inserir um código temporário
                enviado para seu dispositivo móvel ou e-mail quando fizer login.
                Isso ajuda a proteger sua conta mesmo se sua senha for comprometida.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="password-change" className="text-base">Alterar senha</Label>
              <p className="text-sm text-muted-foreground">
                É recomendado alterar sua senha periodicamente
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                // This would typically open a password reset flow
                toast.info('Função de alteração de senha será implementada em breve');
              }}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Alterar senha
            </Button>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit"
            disabled={isSubmitting || settings?.two_factor_enabled === twoFactorEnabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar configurações
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
