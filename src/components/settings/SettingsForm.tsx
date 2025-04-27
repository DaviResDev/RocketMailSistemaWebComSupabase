
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings, Settings, SettingsFormData } from '@/hooks/useSettings';

interface SettingsFormProps {
  initialData: Settings | null;
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingsFormData>({
    email_smtp: initialData?.email_smtp || '',
    email_porta: initialData?.email_porta || null,
    email_usuario: initialData?.email_usuario || '',
    email_senha: initialData?.email_senha || '',
    whatsapp_token: initialData?.whatsapp_token || '',
  });

  const { saveSettings } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Email</CardTitle>
            <CardDescription>
              Configure suas credenciais de email para envio de mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email_smtp">Servidor SMTP</Label>
                <Input
                  id="email_smtp"
                  value={formData.email_smtp || ''}
                  onChange={(e) => setFormData({ ...formData, email_smtp: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="email_porta">Porta</Label>
                <Input
                  id="email_porta"
                  type="number"
                  value={formData.email_porta || ''}
                  onChange={(e) => setFormData({ ...formData, email_porta: parseInt(e.target.value) || null })}
                  placeholder="587"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email_usuario">Usuário</Label>
              <Input
                id="email_usuario"
                value={formData.email_usuario || ''}
                onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                placeholder="seu.email@gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="email_senha">Senha</Label>
              <Input
                id="email_senha"
                type="password"
                value={formData.email_senha || ''}
                onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                placeholder="Sua senha de app"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações do WhatsApp</CardTitle>
            <CardDescription>
              Configure seu token de acesso à API do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="whatsapp_token">Token de Acesso</Label>
              <Input
                id="whatsapp_token"
                value={formData.whatsapp_token || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                placeholder="Seu token de acesso"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full">
          Salvar Configurações
        </Button>
      </div>
    </form>
  );
}
