
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, saveSettings, uploadProfilePhoto } = useSettings();
  const [profileData, setProfileData] = useState<Partial<SettingsFormData>>({
    area_negocio: '',
    foto_perfil: null
  });

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setProfileData({
        area_negocio: settings.area_negocio || '',
        foto_perfil: settings.foto_perfil || null
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings) return;
    
    // Create complete form data from current settings plus updated profile data
    const formData: SettingsFormData = {
      email_smtp: settings.email_smtp,
      email_porta: settings.email_porta,
      email_usuario: settings.email_usuario,
      email_senha: settings.email_senha,
      area_negocio: profileData.area_negocio || null,
      foto_perfil: profileData.foto_perfil,
      smtp_seguranca: settings.smtp_seguranca || null,
      smtp_nome: settings.smtp_nome || null
    };
    
    const success = await saveSettings(formData);
    
    if (success && onSave) {
      onSave();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    
    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error('Formato de arquivo não suportado. Use JPG, PNG ou GIF');
      return;
    }
    
    try {
      const photoUrl = await uploadProfilePhoto(file);
      if (photoUrl) {
        setProfileData({
          ...profileData,
          foto_perfil: photoUrl
        });
        toast.success('Foto de perfil carregada com sucesso!');
      }
    } catch (error: any) {
      toast.error('Erro ao enviar a foto: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Atualize as informações do seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profileData.foto_perfil || undefined} alt="Avatar" />
              <AvatarFallback>
                {settings?.email_usuario ? settings.email_usuario.substring(0, 2).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            
            <Label 
              htmlFor="avatar-upload"
              className="cursor-pointer flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              <span>Carregar foto</span>
              <Input 
                id="avatar-upload" 
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area_negocio">Área de Negócio</Label>
            <Input
              id="area_negocio"
              placeholder="Ex: Marketing Digital"
              value={profileData.area_negocio || ''}
              onChange={(e) => setProfileData({ ...profileData, area_negocio: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Esta informação aparecerá na assinatura dos seus e-mails.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Salvar perfil
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
