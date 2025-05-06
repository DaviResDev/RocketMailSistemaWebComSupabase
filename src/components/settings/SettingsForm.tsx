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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
    two_factor_enabled: false
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
        two_factor_enabled: settings.two_factor_enabled || false
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
                Configure seus dados para envio de emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Seus emails agora são enviados pelo serviço Resend para maior confiabilidade. 
                  As informações abaixo são usadas apenas para personalizar seus envios.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Nome do Remetente</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Ex: Marketing DisparoPro"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este nome aparecerá como remetente dos emails enviados.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email_usuario">Email do Remetente</Label>
                <Input
                  id="email_usuario"
                  placeholder="Ex: contato@seudominio.com"
                  value={formData.email_usuario || ''}
                  onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este email aparecerá como remetente dos emails enviados.
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
                  Esta informação aparecerá na assinatura dos seus emails.
                </p>
              </div>
              
              {/* Mantenha os campos de configuração SMTP escondidos mas não os remova 
                 para manter compatibilidade com código existente */}
              <input type="hidden" 
                id="email_smtp" 
                value={formData.email_smtp || ''} 
              />
              <input type="hidden" 
                id="email_porta" 
                value={formData.email_porta?.toString() || ''} 
              />
              <input type="hidden" 
                id="smtp_seguranca" 
                value={formData.smtp_seguranca || 'tls'} 
              />
              <input type="hidden" 
                id="email_senha" 
                value={formData.email_senha || ''} 
              />
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
