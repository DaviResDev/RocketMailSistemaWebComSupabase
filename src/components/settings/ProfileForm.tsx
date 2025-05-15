import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { Loader2, Save, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, saveSettings, uploadProfilePhoto } = useSettings();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<Partial<SettingsFormData>>({
    area_negocio: '',
    foto_perfil: '',
    smtp_nome: '',
    email_usuario: '',
    signature_image: '',
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        area_negocio: settings.area_negocio || '',
        foto_perfil: settings.foto_perfil || '',
        smtp_nome: settings.smtp_nome || '',
        email_usuario: settings.email_usuario || '',
        signature_image: settings.signature_image || '',
        // Make sure we include the use_smtp field to fix the type error
        use_smtp: settings.use_smtp
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para salvar configurações');
      return;
    }
    
    setUploading(true);
    try {
      // Upload photo if selected
      if (photoFile) {
        const photoUrl = await uploadProfilePhoto(photoFile);
        if (photoUrl) {
          setFormData({...formData, foto_perfil: photoUrl});
        }
      }
      
      // Upload signature if selected
      if (signatureFile) {
        try {
          const fileExt = signatureFile.name.split('.').pop();
          const fileName = `signature-${Date.now()}.${fileExt}`;
          const filePath = `signatures/${user.id}/${fileName}`;
          
          // Verificamos se o bucket existe e se não existe, criamos um novo
          const { data: bucketExists } = await supabase
            .storage
            .getBucket('profile_signatures');
            
          if (!bucketExists) {
            // Tente criar o bucket se ele não existir
            try {
              await supabase.storage.createBucket('profile_signatures', {
                public: true,
                fileSizeLimit: 5242880, // 5MB
              });
            } catch (bucketError) {
              console.log("Bucket já existe ou erro ao criar:", bucketError);
              // Continuar mesmo se houver erro, pois o bucket pode já existir
            }
          }
          
          // Upload do arquivo
          const { data, error } = await supabase.storage
            .from('profile_signatures')
            .upload(filePath, signatureFile, {
              cacheControl: '3600',
              upsert: true // Alterado para true para sobrescrever se já existir
            });
          
          if (error) {
            console.error("Erro detalhado:", error);
            throw error;
          }
          
          // Busca a URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('profile_signatures')
            .getPublicUrl(filePath);
            
          console.log("Assinatura carregada com sucesso:", publicUrl);
          setFormData({ ...formData, signature_image: publicUrl });
          
        } catch (error: any) {
          console.error('Erro ao carregar assinatura:', error);
          toast.error(`Erro ao carregar assinatura: ${error.message || 'Verifique o console para mais detalhes'}`);
        }
      }
    } finally {
      setUploading(false);
      setPhotoFile(null);
      setSignatureFile(null);
    }
    
    // Include all required fields in the saveSettings call
    const completeFormData: SettingsFormData = {
      email_smtp: settings?.email_smtp || '',
      email_porta: settings?.email_porta,
      email_usuario: formData.email_usuario || '',
      email_senha: settings?.email_senha || '',
      area_negocio: formData.area_negocio || null,
      foto_perfil: formData.foto_perfil || null,
      smtp_seguranca: settings?.smtp_seguranca || 'tls',
      smtp_nome: formData.smtp_nome || null,
      signature_image: formData.signature_image || null,
      two_factor_enabled: settings?.two_factor_enabled || false,
      use_smtp: settings?.use_smtp || false
    };
    
    const success = await saveSettings(completeFormData);
    if (success && onSave) {
      onSave();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'photo') {
        setPhotoFile(e.target.files[0]);
      } else {
        setSignatureFile(e.target.files[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando informações de perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Seu Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e de contato.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.foto_perfil || ''} alt="Foto de perfil" />
              <AvatarFallback className="text-lg">
                {formData.smtp_nome ? formData.smtp_nome.substring(0, 2).toUpperCase() : 'DP'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <Label htmlFor="photo" className="block mb-2">Foto de Perfil</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="max-w-sm"
                  onChange={(e) => handleFileChange(e, 'photo')}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_nome">Nome Completo</Label>
            <Input
              id="smtp_nome"
              placeholder="Seu nome completo"
              value={formData.smtp_nome || ''}
              onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email_usuario">Email para Contato</Label>
            <Input
              id="email_usuario"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={formData.email_usuario || ''}
              onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area_negocio">Área de Atuação</Label>
            <Input
              id="area_negocio"
              placeholder="Ex: Marketing Digital, E-commerce, Consultoria"
              value={formData.area_negocio || ''}
              onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Esta informação será utilizada na assinatura dos seus emails.
            </p>
          </div>

          <Separator className="my-4" />
          
          <div>
            <h3 className="text-lg font-medium mb-2">Assinatura Digital</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione sua assinatura digital que será exibida nos emails enviados
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signature">Imagem da Assinatura</Label>
                <Input
                  id="signature"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'signature')}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: assinatura em PNG com fundo transparente
                </p>
              </div>
              
              {formData.signature_image && (
                <div className="border p-4 rounded-md">
                  <p className="text-sm font-medium mb-2">Assinatura atual:</p>
                  <img 
                    src={formData.signature_image} 
                    alt="Assinatura digital" 
                    className="max-h-20 object-contain" 
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" disabled={loading || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fazendo upload...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar perfil
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
