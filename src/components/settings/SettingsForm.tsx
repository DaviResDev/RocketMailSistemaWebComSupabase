
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, KeyRound, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

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
    use_smtp: false, // Default to Resend since SMTP has limitations
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
        use_smtp: settings.use_smtp || false, // Default to Resend
        signature_image: settings.signature_image || null
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
                Configure suas configurações de envio de email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recomendação:</strong> Use o serviço Resend para melhor confiabilidade e entrega de emails. 
                  O SMTP direto tem limitações no ambiente serverless.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-smtp"
                  checked={formData.use_smtp}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, use_smtp: checked })
                  }
                />
                <Label htmlFor="use-smtp">
                  {formData.use_smtp ? "Usar SMTP (limitado no ambiente serverless)" : "Usar serviço Resend (recomendado)"}
                </Label>
              </div>

              {formData.use_smtp && (
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aviso:</strong> SMTP direto possui limitações no ambiente serverless e pode não funcionar corretamente. 
                    Recomendamos usar o serviço Resend para garantir a entrega dos emails.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Nome do Remetente</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Ex: Marketing RocketMail"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Este nome aparecerá como o remetente dos seus emails.
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
                  Este email será usado como remetente e para respostas.
                  {!formData.use_smtp && (
                    <span className="block mt-1 text-amber-600">
                      <strong>Nota:</strong> Com o serviço Resend, seu domínio precisa ser verificado para envio direto. Caso contrário, o email mostrará como enviado pelo Resend com seu endereço como endereço de resposta.
                      <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="block underline mt-1">
                        Verificar seu domínio no Resend
                      </a>
                    </span>
                  )}
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
              
              {formData.use_smtp ? (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4">Configurações do Servidor SMTP (Limitado)</h3>
                    
                    <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Limitação Técnica:</strong> O SMTP direto não funciona completamente no ambiente serverless devido a restrições de DNS. 
                        Os emails configurados com SMTP serão automaticamente enviados via Resend como fallback.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid gap-4 opacity-60">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp">Servidor SMTP</Label>
                        <Input
                          id="email_smtp"
                          placeholder="Ex: smtp.gmail.com"
                          value={formData.email_smtp || ''}
                          onChange={(e) => setFormData({ ...formData, email_smtp: e.target.value })}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">
                          Desabilitado devido a limitações do ambiente serverless
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email_porta">Porta</Label>
                          <Input
                            id="email_porta"
                            type="number"
                            placeholder="Ex: 587"
                            value={formData.email_porta?.toString() || ''}
                            onChange={(e) => setFormData({ ...formData, email_porta: parseInt(e.target.value) || null })}
                            disabled
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="smtp_seguranca">Segurança</Label>
                          <Select
                            value={formData.smtp_seguranca || 'tls'}
                            onValueChange={(value) => setFormData({ ...formData, smtp_seguranca: value })}
                            disabled
                          >
                            <SelectTrigger id="smtp_seguranca">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS/STARTTLS</SelectItem>
                              <SelectItem value="ssl">SSL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_senha">Senha SMTP</Label>
                        <Input
                          id="email_senha"
                          type="password"
                          placeholder="Sua senha SMTP"
                          value={formData.email_senha || ''}
                          onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Você está usando o serviço Resend para envio de emails. Apenas mantenha seu nome e email de remetente atualizados.
                    <a 
                      href="https://resend.com/domains" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block mt-2 underline"
                    >
                      Para usar seu próprio domínio como remetente, verifique-o no Resend
                    </a>
                  </AlertDescription>
                </Alert>
              )}
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
