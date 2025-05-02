
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsFormProps {
  onSave?: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { settings, loading, saveSettings, testSmtpConnection } = useSettings();
  const [formData, setFormData] = useState<SettingsFormData>({
    email_smtp: '',
    email_porta: null,
    email_usuario: '',
    email_senha: '',
    area_negocio: null,
    foto_perfil: null,
    smtp_seguranca: 'tls',
    smtp_nome: null
  });
  const [testingConnection, setTestingConnection] = useState(false);

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      console.log("Setting form data from settings:", settings);
      setFormData({
        email_smtp: settings.email_smtp || '',
        email_porta: settings.email_porta,
        email_usuario: settings.email_usuario || '',
        email_senha: settings.email_senha || '',
        area_negocio: settings.area_negocio,
        foto_perfil: settings.foto_perfil,
        smtp_seguranca: settings.smtp_seguranca || 'tls',
        smtp_nome: settings.smtp_nome || ''
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    const success = await saveSettings(formData);
    if (success && onSave) {
      onSave();
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await testSmtpConnection(formData);
    } finally {
      setTestingConnection(false);
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
    <Tabs defaultValue="email">
      <TabsList className="mb-4">
        <TabsTrigger value="email" className="flex items-center">
          <Mail className="h-4 w-4 mr-2" />
          Email
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center">
          <KeyRound className="h-4 w-4 mr-2" />
          Segurança
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="email">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Configurações de Email</CardTitle>
              <CardDescription>
                Configure seu serviço de email para envio de mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Nome da Conta</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Ex: Email de Marketing"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_smtp">Servidor SMTP</Label>
                  <Input
                    id="email_smtp"
                    placeholder="Ex: smtp.gmail.com"
                    value={formData.email_smtp || ''}
                    onChange={(e) => setFormData({ ...formData, email_smtp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_porta">Porta</Label>
                  <Input
                    id="email_porta"
                    type="number"
                    placeholder="Ex: 587"
                    value={formData.email_porta?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, email_porta: parseInt(e.target.value) || null })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp_seguranca">Segurança</Label>
                <Select 
                  value={formData.smtp_seguranca || 'tls'} 
                  onValueChange={(value) => setFormData({ ...formData, smtp_seguranca: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo de segurança" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">Nenhuma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_usuario">Usuário</Label>
                  <Input
                    id="email_usuario"
                    placeholder="Ex: seu.email@gmail.com"
                    value={formData.email_usuario || ''}
                    onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_senha">Senha</Label>
                  <Input
                    id="email_senha"
                    type="password"
                    placeholder="Sua senha ou chave de app"
                    value={formData.email_senha || ''}
                    onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_negocio">Área de Negócio</Label>
                <Input
                  id="area_negocio"
                  placeholder="Ex: Marketing Digital"
                  value={formData.area_negocio || ''}
                  onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
                />
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.email_smtp || !formData.email_usuario || !formData.email_senha}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão SMTP
                </Button>
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
