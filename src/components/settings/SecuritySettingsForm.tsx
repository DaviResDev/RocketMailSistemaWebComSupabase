
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, AlertTriangle, Check, Loader2, Shield, Copy } from 'lucide-react';
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export function SecuritySettingsForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  
  // Check if 2FA is already enabled
  useEffect(() => {
    const checkMfaStatus = async () => {
      if (!user) return;
      
      try {
        // Store user settings in configuracoes table instead of user_settings since that's not 
        // in the types file yet
        const { data, error } = await supabase
          .from('configuracoes')
          .select('two_factor_enabled')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data && data.two_factor_enabled) {
          setHas2FA(true);
          setMfaEnabled(true);
        }
      } catch (error) {
        console.error("Error checking 2FA status:", error);
      }
    };
    
    checkMfaStatus();
  }, [user]);
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não correspondem");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        toast.error("Senha atual incorreta");
        throw signInError;
      }
      
      // Then update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      toast.success("Senha alterada com sucesso");
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(`Erro ao alterar senha: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMFA = async () => {
    if (has2FA) {
      // Show confirmation to disable 2FA
      setDialogOpen(true);
    } else {
      // Start setup process
      setSetupDialogOpen(true);
      await setupMFA();
    }
  };

  const setupMFA = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would generate a TOTP secret
      // and save it securely. For this demo, we'll simulate it.
      const mockSecret = "EXAMPLETOTP234567";
      const mockQrCode = "https://api.qrserver.com/v1/create-qr-code/?data=otpauth://totp/DisparoPro:user@example.com?secret=EXAMPLETOTP234567&issuer=DisparoPro&algorithm=SHA1&digits=6&period=30";
      
      setSecretKey(mockSecret);
      setQrCodeUrl(mockQrCode);
      
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      toast.error("Erro ao configurar verificação em duas etapas");
    } finally {
      setLoading(false);
    }
  };
  
  const verifySetup = async () => {
    try {
      setVerifying(true);
      
      // In a real implementation, you would verify the code against the TOTP
      if (verificationCode.length === 6) {
        // For demo purposes, any 6-digit code is accepted
        // Save the 2FA status
        if (user) {
          const { error } = await supabase
            .from('configuracoes')
            .update({
              two_factor_enabled: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
          
          if (error) throw error;
        }
        
        setHas2FA(true);
        setMfaEnabled(true);
        setVerifyDialogOpen(false);
        setSetupDialogOpen(false);
        toast.success("Verificação em duas etapas configurada com sucesso!");
      } else {
        toast.error("Código inválido. Tente novamente.");
      }
    } catch (error: any) {
      console.error("Error verifying 2FA setup:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  };
  
  const disableMFA = async () => {
    try {
      setLoading(true);
      
      if (user) {
        const { error } = await supabase
          .from('configuracoes')
          .update({
            two_factor_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
      
      setHas2FA(false);
      setMfaEnabled(false);
      setDialogOpen(false);
      toast.success("Verificação em duas etapas desativada com sucesso!");
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      toast.error(`Erro ao desativar verificação em duas etapas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(secretKey);
    toast.info("Chave secreta copiada para a área de transferência!");
  };

  return (
    <>
      <Card className="mb-6">
        <form onSubmit={handlePasswordChange}>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input 
                id="current-password" 
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input 
                id="new-password" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input 
                id="confirm-password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação em Duas Etapas</CardTitle>
          <CardDescription>
            Aumente a segurança da sua conta com verificação em duas etapas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mfa">Verificação em duas etapas</Label>
              <p className="text-sm text-muted-foreground">
                Receba um código de verificação cada vez que fizer login
              </p>
            </div>
            <Switch 
              id="mfa" 
              checked={mfaEnabled} 
              onCheckedChange={toggleMFA}
            />
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Com a verificação em duas etapas ativada, você precisará fornecer um código de autenticação, além da sua senha, cada vez que fizer login.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      {/* Dialog for disabling 2FA */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar verificação em duas etapas?</DialogTitle>
            <DialogDescription>
              Isso reduzirá a segurança da sua conta. Tem certeza que deseja desativar?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Sem a verificação em duas etapas, sua conta estará mais vulnerável a acessos não autorizados.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={disableMFA}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                "Desativar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for setting up 2FA */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar verificação em duas etapas</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo com seu aplicativo de autenticação ou insira a chave manualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code para autenticação" 
                  className="w-48 h-48 border rounded"
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Chave Secreta</Label>
              <div className="flex items-center space-x-2">
                <Input value={secretKey} readOnly className="font-mono text-sm" />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={copySecretToClipboard}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Se não conseguir escanear o QR code, insira esta chave no seu aplicativo de autenticação.
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSetupDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                setSetupDialogOpen(false);
                setVerifyDialogOpen(true);
              }}
              disabled={loading}
            >
              <Shield className="mr-2 h-4 w-4" />
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for verifying 2FA setup */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verificar configuração</DialogTitle>
            <DialogDescription>
              Digite o código de 6 dígitos mostrado no seu aplicativo de autenticação para confirmar a configuração.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} index={index} />
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setVerifyDialogOpen(false);
                setSetupDialogOpen(true);
              }}
            >
              Voltar
            </Button>
            <Button 
              onClick={verifySetup}
              disabled={verifying || verificationCode.length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Verificar e Ativar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
