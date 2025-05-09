
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, KeyRound, CheckCircle2, Loader2, Send, AlertCircle, Info } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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
    use_smtp: true // Default to using SMTP
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
        use_smtp: settings.use_smtp !== undefined ? settings.use_smtp : true // Default to using SMTP if not defined
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
  
  // Function to test SMTP connection
  const handleTestSmtpConnection = async () => {
    if (!formData.email_usuario) {
      toast.error("Please enter your sender email address before testing");
      return;
    }

    setTestingSmtp(true);
    try {
      const result = await testSmtpConnection(formData);
      
      if (result.success) {
        toast.success(
          <div>
            <p><strong>Connection successful!</strong></p>
            <p>A test email has been sent to your address. Check your inbox.</p>
            <p className="text-xs mt-2">{formData.use_smtp ? 
              'Sent via your configured SMTP server' : 
              'Sent via Resend service with your email as reply-to'}
            </p>
          </div>, 
          { duration: 6000 }
        );
      } else {
        toast.error(
          <div>
            <p><strong>Connection failed</strong></p>
            <p>{result.message || "Could not test connection"}</p>
          </div>
        );
      }
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading settings...</p>
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
          Security
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="email">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure your email sending settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can choose between using the Resend service or configuring your own SMTP server for sending emails.
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
                  {formData.use_smtp ? "Use my own SMTP server" : "Use Resend service (recommended)"}
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Sender Name</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Ex: Marketing DisparoPro"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear as the sender of your emails.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email_usuario">Sender Email</Label>
                <Input
                  id="email_usuario"
                  placeholder="Ex: contact@yourdomain.com"
                  value={formData.email_usuario || ''}
                  onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This email will be used as the sender and for replies.
                  {!formData.use_smtp && (
                    <span className="block mt-1 text-amber-600">
                      <strong>Note:</strong> With Resend service, your domain needs to be verified for direct sending. Otherwise, the email will show as sent from Resend with your address as the reply-to address.
                      <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="block underline mt-1">
                        Verify your domain on Resend
                      </a>
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_negocio">Business Area</Label>
                <Input
                  id="area_negocio"
                  placeholder="Ex: Digital Marketing"
                  value={formData.area_negocio || ''}
                  onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This information will appear in your email signature.
                </p>
              </div>
              
              {formData.use_smtp ? (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4">SMTP Server Settings</h3>
                    
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp">SMTP Server</Label>
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
                          <Label htmlFor="email_porta">Port</Label>
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
                          <Label htmlFor="smtp_seguranca">Security</Label>
                          <Select
                            value={formData.smtp_seguranca || 'tls'}
                            onValueChange={(value) => setFormData({ ...formData, smtp_seguranca: value })}
                          >
                            <SelectTrigger id="smtp_seguranca">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS/STARTTLS</SelectItem>
                              <SelectItem value="ssl">SSL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_usuario_smtp">SMTP Username</Label>
                        <Input
                          id="email_usuario_smtp"
                          type="email"
                          placeholder="Ex: your.email@gmail.com"
                          value={formData.email_usuario || ''}
                          onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                          required={formData.use_smtp}
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          The sender email is used as the SMTP username.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_senha">SMTP Password</Label>
                        <Input
                          id="email_senha"
                          type="password"
                          placeholder="Your SMTP password"
                          value={formData.email_senha || ''}
                          onChange={(e) => setFormData({ ...formData, email_senha: e.target.value })}
                          required={formData.use_smtp}
                        />
                        <p className="text-xs text-muted-foreground">
                          For Gmail, use an app password generated at: https://myaccount.google.com/apppasswords
                        </p>
                      </div>
                    </div>
                    
                    <Alert className="mt-4 bg-yellow-50 text-yellow-800 border-yellow-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Make sure your SMTP server allows sending from external applications and that you've entered the correct port and security settings. For Gmail, you must create an app password.
                      </AlertDescription>
                    </Alert>
                  </div>
                </>
              ) : (
                <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    You're using the Resend service for email sending. Just keep your sender name and email updated.
                    <a 
                      href="https://resend.com/domains" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block mt-2 underline"
                    >
                      To use your own domain as sender, verify it on Resend
                    </a>
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="button"
                variant="outline"
                onClick={handleTestSmtpConnection}
                disabled={testingSmtp || (!formData.email_usuario)}
                className="mt-2"
              >
                {testingSmtp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save settings
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
