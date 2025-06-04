
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, KeyRound, Info } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmtpStatusIndicator } from './SmtpStatusIndicator';

interface SettingsFormProps {
  onSave?: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { settings, loading, saveSettings } = useSettings();
  const [formData, setFormData] = useState<SettingsFormData>({
    email_smtp: '',
    email_porta: null,
    email_usuario: '',
    email_senha: '',
    area_negocio: null,
    foto_perfil: null,
    smtp_seguranca: 'tls',
    smtp_nome: null,
    two_factor_enabled: false,
    use_smtp: false,
    signature_image: null
  });

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        email_smtp: settings.email_smtp || '',
        email_porta: settings.email_porta,
        email_usuario: settings.email_usuario || '',
        email_senha: settings.email_senha || '',
        area_negocio: settings.area_negocio,
        foto_perfil: settings.foto_perfil,
        smtp_seguranca: settings.smtp_seguranca || 'tls',
        smtp_nome: settings.smtp_nome || '',
        two_factor_enabled: settings.two_factor_enabled || false,
        use_smtp: false, // Always disabled
        signature_image: settings.signature_image || null
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only save basic profile information, no email settings
    const profileData = {
      ...formData,
      use_smtp: false,
      email_smtp: '',
      email_porta: null,
      email_senha: '',
      smtp_seguranca: 'tls'
    };
    const success = await saveSettings(profileData);
    if (success && onSave) {
      onSave();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList className="mb-4">
        <TabsTrigger value="profile" className="flex items-center">
          <Info className="h-4 w-4 mr-2" />
          Perfil
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center">
          <KeyRound className="h-4 w-4 mr-2" />
          Segurança
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Configurações de Perfil</CardTitle>
              <CardDescription>
                Configure suas informações pessoais e profissionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nota:</strong> As funcionalidades de envio de email (SMTP e Resend) foram removidas do sistema. 
                  Você pode continuar gerenciando templates e contatos normalmente.
                </AlertDescription>
              </Alert>

              <SmtpStatusIndicator 
                useSmtp={false}
                hasSmtpSettings={false}
                hasResendConfig={false}
              />

              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Nome do Remetente</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Ex: Marketing RocketMail"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este nome será usado nos templates para personalização.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email_usuario">Email de Referência</Label>
                <Input
                  id="email_usuario"
                  placeholder="Ex: contato@seudominio.com"
                  value={formData.email_usuario || ''}
                  onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este email será usado como referência nos templates e assinaturas.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_negocio">Área de Negócio</Label>
                <Input
                  id="area_negocio"
                  placeholder="Ex: Marketing Digital"
                  value={formData.area_negocio || ''}
                  onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Esta informação aparecerá na sua assinatura de email.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Salvar configurações
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      
      <TabsContent value="security">
        <SecuritySettingsForm />
      </TabsContent>
    </Tabs>
  );
}
