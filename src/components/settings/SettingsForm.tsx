
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, KeyRound, CheckCircle2, AlertCircle, Info, Zap, TestTube } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

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
    smtp_nome: null,
    two_factor_enabled: false,
    use_smtp: false,
    signature_image: null
  });
  const [testing, setTesting] = useState(false);

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

  const handleTestConnection = async () => {
    if (!formData.email_usuario) {
      alert('Preencha o email do remetente antes de testar');
      return;
    }
    
    setTesting(true);
    try {
      await testSmtpConnection(formData);
    } finally {
      setTesting(false);
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

  // Check if SMTP is properly configured
  const hasSmtpSettings = !!(formData.email_smtp && formData.email_porta && formData.email_usuario && formData.email_senha);

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
                Configure suas configurações de envio de email com melhor entrega e controle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sistema Híbrido:</strong> Configure SMTP para usar seu próprio servidor de email com fallback automático para Resend em caso de falha.
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
                <div className="flex flex-col">
                  <Label htmlFor="use-smtp" className="flex items-center">
                    {formData.use_smtp ? (
                      <>
                        <Zap className="h-4 w-4 mr-1 text-green-500" />
                        Usar SMTP com fallback Resend (recomendado)
                      </>
                    ) : (
                      "Usar apenas serviço Resend"
                    )}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.use_smtp 
                      ? "Tentará SMTP primeiro, fallback para Resend se falhar"
                      : "Usar apenas Resend para entrega confiável"}
                  </span>
                </div>
              </div>

              {/* Status indicator based on current configuration */}
              {formData.use_smtp ? (
                hasSmtpSettings ? (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sistema Híbrido Ativo:</strong> SMTP configurado com fallback Resend para máxima confiabilidade!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-red-50 text-red-800 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Configuração Incompleta:</strong> SMTP ativado mas não configurado. Complete as configurações abaixo.
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Modo Resend:</strong> Todos os emails serão enviados via Resend.
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
                      <strong>Nota:</strong> Com o serviço Resend, seu domínio precisa ser verificado para envio direto.
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
              
              {formData.use_smtp && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-green-500" />
                      Configurações SMTP (Com Fallback Inteligente)
                    </h3>
                    
                    <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Sistema Híbrido Ativo:</strong> Os emails serão enviados via seu SMTP primeiro. 
                        Em caso de falha, o sistema automaticamente usará Resend como backup para garantir a entrega.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp">Servidor SMTP</Label>
                        <Input
                          id="email_smtp"
                          placeholder="Ex: smtp.gmail.com, smtp.office365.com"
                          value={formData.email_smtp || ''}
                          onChange={(e) => setFormData({ ...formData, email_smtp: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Servidor SMTP do seu provedor de email
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email_porta">Porta</Label>
                          <Input
                            id="email_porta"
                            type="number"
                            placeholder="587 (TLS) ou 465 (SSL)"
                            value={formData.email_porta?.toString() || ''}
                            onChange={(e) => setFormData({ ...formData, email_porta: parseInt(e.target.value) || null })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="smtp_seguranca">Segurança</Label>
                          <Select
                            value={formData.smtp_seguranca || 'tls'}
                            onValueChange={(value) => setFormData({ ...formData, smtp_seguranca: value })}
                          >
                            <SelectTrigger id="smtp_seguranca">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS/STARTTLS (porta 587)</SelectItem>
                              <SelectItem value="ssl">SSL (porta 465)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_senha">Senha SMTP / Senha de App</Label>
                        <Input
                          id="email_senha"
                          type="password"
                          placeholder="Sua senha SMTP ou senha de aplicativo"
                          value={formData.email_senha || ''}
                          onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Para Gmail/Google Workspace, use uma senha de aplicativo. 
                          <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                            Como gerar
                          </a>
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testing || !formData.email_usuario}
                          className="flex items-center"
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          {testing ? 'Testando...' : 'Testar Configuração'}
                        </Button>
                      </div>
                      
                      {!hasSmtpSettings && (
                        <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Complete todos os campos SMTP acima para ativar o envio híbrido.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!formData.use_smtp && (
                <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Você está usando apenas o serviço Resend para envio de emails.
                    <a 
                      href="https://resend.com/domains" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block mt-2 underline"
                    >
                      Para usar seu próprio domínio, verifique-o no Resend
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
