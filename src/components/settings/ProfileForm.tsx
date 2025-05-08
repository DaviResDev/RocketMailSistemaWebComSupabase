
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { Loader2, Save, Upload } from 'lucide-react';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, saveSettings, uploadProfilePhoto } = useSettings();
  const [formData, setFormData] = useState<Partial<SettingsFormData>>({
    area_negocio: '',
    foto_perfil: '',
    smtp_nome: '',
    email_usuario: '',
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        area_negocio: settings.area_negocio || '',
        foto_perfil: settings.foto_perfil || '',
        smtp_nome: settings.smtp_nome || '',
        email_usuario: settings.email_usuario || '',
        // Make sure we include the use_smtp field to fix the type error
        use_smtp: settings.use_smtp
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload photo if selected
    if (photoFile) {
      setUploading(true);
      try {
        const photoUrl = await uploadProfilePhoto(photoFile);
        if (photoUrl) {
          setFormData({...formData, foto_perfil: photoUrl});
        }
      } finally {
        setUploading(false);
        setPhotoFile(null);
      }
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
      two_factor_enabled: settings?.two_factor_enabled || false,
      use_smtp: settings?.use_smtp || false
    };
    
    const success = await saveSettings(completeFormData);
    if (success && onSave) {
      onSave();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
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
                  onChange={handleFileChange}
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
