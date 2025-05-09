
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, KeyRound, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    use_smtp: true // Definindo padrão para usar SMTP
  });
  
  const [testingSmtp, setTestingSmtp] = useState(false);

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
        use_smtp: settings.use_smtp !== undefined ? settings.use_smtp : true // Definindo padrão para usar SMTP se não estiver definido
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
  
  // Função para testar a conexão SMTP
  const testSmtpConnection = async () => {
    if (!formData.email_usuario) {
      toast.error("Preencha pelo menos o email do remetente antes de testar");
      return;
    }
    
    if (formData.use_smtp && (!formData.email_smtp || !formData.email_porta || !formData.email_senha)) {
      toast.error("Preencha todos os campos de configuração SMTP antes de testar");
      return;
    }
    
    setTestingSmtp(true);
    
    try {
      // Chamar a função de teste SMTP
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: {
          smtp_server: formData.email_smtp,
          smtp_port: Number(formData.email_porta),
          smtp_user: formData.email_usuario,
          smtp_password: formData.email_senha,
          smtp_security: formData.smtp_seguranca,
          use_resend: !formData.use_smtp
        },
      });
      
      console.log("Resposta do teste:", data, error);
      
      if (error) {
        console.error("Erro ao testar conexão:", error);
        toast.error(`Erro ao testar conexão: ${error.message}`);
        return;
      }
      
      if (data.error) {
        toast.error(`Erro no teste: ${data.error}`);
        return;
      }
      
      if (data.success) {
        toast.success(`Conexão testada com sucesso via ${data.provider === 'smtp' ? 'SMTP' : 'Resend'}!`);
      } else {
        toast.error(data.message || "Falha no teste de conexão");
      }
    } catch (error: any) {
      console.error("Erro ao testar configurações:", error);
      toast.error(`Erro ao testar: ${error.message}`);
    } finally {
      setTestingSmtp(false);
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
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você pode escolher entre usar o serviço Resend para envio de emails ou configurar seu próprio servidor SMTP.
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
                  {formData.use_smtp ? "Usar meu próprio servidor SMTP" : "Usar serviço Resend (recomendado)"}
                </Label>
              </div>

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
                  Este email aparecerá como remetente e será usado para respostas.
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
              
              {formData.use_smtp ? (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4">Configurações do Servidor SMTP</h3>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp">Servidor SMTP</Label>
                        <Input
                          id="email_smtp"
                          placeholder="Ex: smtp.gmail.com"
                          value={formData.email_smtp || ''}
                          onChange={(e) => setFormData({ ...formData, email_smtp: e.target.value })}
                          required={formData.use_smtp}
                        />
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
                            required={formData.use_smtp}
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
                              <SelectItem value="tls">TLS/STARTTLS</SelectItem>
                              <SelectItem value="ssl">SSL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_usuario_smtp">Usuário SMTP</Label>
                        <Input
                          id="email_usuario_smtp"
                          type="email"
                          placeholder="Ex: seu.email@gmail.com"
                          value={formData.email_usuario || ''}
                          onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                          required={formData.use_smtp}
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          O email do remetente é usado como usuário SMTP.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_senha">Senha SMTP</Label>
                        <Input
                          id="email_senha"
                          type="password"
                          placeholder="Sua senha SMTP"
                          value={formData.email_senha || ''}
                          onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                          required={formData.use_smtp}
                        />
                        <p className="text-xs text-muted-foreground">
                          Para Gmail, use uma senha de aplicativo gerada em: https://myaccount.google.com/apppasswords
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={testSmtpConnection}
                      disabled={testingSmtp}
                      className="mt-4"
                    >
                      {testingSmtp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Você está usando o serviço Resend para envio de emails. Mantenha apenas o nome e email do remetente atualizados.
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
