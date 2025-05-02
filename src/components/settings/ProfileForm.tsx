
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRound, Upload, Save, User } from 'lucide-react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, fetchSettings, saveSettings, uploadProfilePhoto } = useSettings();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<SettingsFormData>>({
    area_negocio: null
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        foto_perfil: settings.foto_perfil,
        area_negocio: settings.area_negocio
      });
    }
  }, [settings]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingPhoto(true);
    
    try {
      const url = await uploadProfilePhoto(file);
      if (url) {
        setFormData({ ...formData, foto_perfil: url });
      }
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedSettings: SettingsFormData = {
      email_smtp: settings?.email_smtp || null,
      email_porta: settings?.email_porta || null,
      email_usuario: settings?.email_usuario || null,
      email_senha: settings?.email_senha || null,
      foto_perfil: formData.foto_perfil || null,
      area_negocio: formData.area_negocio || null
    };
    
    const success = await saveSettings(updatedSettings);
    if (success && onSave) {
      onSave();
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
          <CardTitle>Seu Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e foto de perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-24 h-24">
                {formData.foto_perfil ? (
                  <AvatarImage src={formData.foto_perfil} />
                ) : (
                  <AvatarFallback>
                    <UserRound className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Upload className="h-4 w-4" />
                {uploadingPhoto ? 'Enviando...' : 'Alterar foto'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_negocio">Área de Negócio</Label>
                <Input
                  id="area_negocio"
                  placeholder="Ex: Consultoria Financeira"
                  value={formData.area_negocio || ''}
                  onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
                />
              </div>
            </div>
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
