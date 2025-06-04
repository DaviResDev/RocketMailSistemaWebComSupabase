
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, KeyRound, Info, Mail, TestTube } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmtpStatusIndicator } from './SmtpStatusIndicator';
import { toast } from 'sonner';

interface SettingsFormProps {
  onSave?: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { settings, loading, saveSettings, testSmtpConnection } = useSettings();
  const [testingConnection, setTestingConnection] = useState(false);
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
    signature_image: null,
    smtp_host: null,
    smtp_pass: null,
    smtp_from_name: null
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
        use_smtp: settings.use_smtp || false,
        signature_image: settings.signature_image || null,
        smtp_host: settings.smtp_host || '',
        smtp_pass: settings.smtp_pass || '',
        smtp_from_name: settings.smtp_from_name || ''
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveSettings(formData);
    if (success && onSave) {
      onSave();
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testSmtpConnection(formData);
      if (result.success) {
        toast.success('Conexão SMTP testada com sucesso!');
      } else {
        toast.error(`Erro no teste SMTP: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Erro no teste SMTP: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const hasSmtpSettings = formData.smtp_host && formData.email_usuario && formData.smtp_pass;

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
        <TabsTrigger value="email" className="flex items-center">
          <Mail className="h-4 w-4 mr-2" />
          Email
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

      <TabsContent value="email">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Configurações de Email</CardTitle>
              <CardDescription>
                Configure o método de envio de emails: SMTP personalizado ou Resend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SmtpStatusIndicator 
                useSmtp={formData.use_smtp}
                hasSmtpSettings={!!hasSmtpSettings}
                hasResendConfig={true}
              />

              <div className="flex items-center space-x-2">
                <Switch
                  id="use_smtp"
                  checked={formData.use_smtp}
                  onCheckedChange={(checked) => setFormData({ ...formData, use_smtp: checked })}
                />
                <Label htmlFor="use_smtp">Usar SMTP personalizado</Label>
              </div>
              
              {formData.use_smtp && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium">Configurações SMTP</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">Servidor SMTP</Label>
                      <Input
                        id="smtp_host"
                        placeholder="Ex: smtp.gmail.com"
                        value={formData.smtp_host || ''}
                        onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email_porta">Porta</Label>
                      <Input
                        id="email_porta"
                        type="number"
                        placeholder="587"
                        value={formData.email_porta || ''}
                        onChange={(e) => setFormData({ ...formData, email_porta: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_from_name">Nome do Remetente</Label>
                    <Input
                      id="smtp_from_name"
                      placeholder="Ex: Sua Empresa"
                      value={formData.smtp_from_name || ''}
                      onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_usuario_smtp">Email/Usuário</Label>
                    <Input
                      id="email_usuario_smtp"
                      placeholder="Ex: contato@seudominio.com"
                      value={formData.email_usuario || ''}
                      onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_pass">Senha/Token</Label>
                    <Input
                      id="smtp_pass"
                      type="password"
                      placeholder="Sua senha ou token de aplicativo"
                      value={formData.smtp_pass || ''}
                      onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_seguranca">Segurança</Label>
                    <Select
                      value={formData.smtp_seguranca || 'tls'}
                      onValueChange={(value) => setFormData({ ...formData, smtp_seguranca: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de segurança" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasSmtpSettings && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testingConnection ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  )}
                </div>
              )}

              {!formData.use_smtp && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Usando Resend como provedor de email. Os emails serão enviados através do serviço Resend automaticamente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Salvar configurações de email
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
