
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Save, User } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { ProfileForm } from './ProfileForm';

interface SettingsFormProps {
  onSave?: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { settings, loading, fetchSettings, saveSettings } = useSettings();
  const [formData, setFormData] = useState<SettingsFormData>({
    email_smtp: '',
    email_porta: null,
    email_usuario: '',
    email_senha: '',
    whatsapp_token: null,
    foto_perfil: null,
    area_negocio: null
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        email_smtp: settings.email_smtp || '',
        email_porta: settings.email_porta,
        email_usuario: settings.email_usuario || '',
        email_senha: settings.email_senha || '',
        whatsapp_token: settings.whatsapp_token,
        foto_perfil: settings.foto_perfil,
        area_negocio: settings.area_negocio
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
        <TabsTrigger value="personal" className="flex items-center">
          <User className="h-4 w-4 mr-2" />
          Dados Pessoais
        </TabsTrigger>
        <TabsTrigger value="email" className="flex items-center">
          <Mail className="h-4 w-4 mr-2" />
          Email
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          WhatsApp
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal">
        <ProfileForm onSave={onSave} />
      </TabsContent>
      
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
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Salvar configurações
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      
      <TabsContent value="whatsapp">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Token da API WhatsApp</CardTitle>
              <CardDescription>
                Configure o token de acesso para integração com o WhatsApp Business API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_token">Token de Acesso</Label>
                <Input
                  id="whatsapp_token"
                  placeholder="Insira o token da API WhatsApp Business"
                  value={formData.whatsapp_token || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Salvar token
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
