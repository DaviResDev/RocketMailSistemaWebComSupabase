
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Save, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function SecuritySettingsForm() {
  const { settings, saveSettings, loading } = useSettings();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para alterar sua senha');
      return;
    }
    
    // Validar senha
    if (!currentPassword) {
      toast.error('Digite sua senha atual');
      return;
    }
    
    if (!newPassword) {
      toast.error('Digite sua nova senha');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não coincide com a nova senha');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      // Verificar senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });
      
      if (signInError) {
        toast.error('Senha atual incorreta');
        return;
      }
      
      // Alterar senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success('Senha alterada com sucesso!');
      setIsPasswordDialogOpen(false);
      
      // Limpar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(`Erro ao alterar senha: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
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
    <>
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
                onClick={() => setIsPasswordDialogOpen(true)}
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

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar uma nova senha para sua conta
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Digite sua senha atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Digite sua nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirme a nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={isChangingPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar senha'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
