
import { useState, useEffect } from 'react';
import { useSettings, SettingsFormData } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save } from 'lucide-react';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, saveSettings, uploadProfilePhoto } = useSettings();
  const [formData, setFormData] = useState<Pick<SettingsFormData, 'area_negocio' | 'foto_perfil'>>({
    area_negocio: '',
    foto_perfil: null
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        area_negocio: settings.area_negocio || '',
        foto_perfil: settings.foto_perfil
      });
      
      if (settings.foto_perfil) {
        setPreviewUrl(settings.foto_perfil);
      }
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Cleanup previous URL if exists
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const photoUrl = await uploadProfilePhoto(selectedFile);
      if (photoUrl) {
        setFormData({ ...formData, foto_perfil: photoUrl });
        // Não salvamos ainda, apenas quando o usuário clicar em salvar
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Manter os campos existentes do settings, atualizando apenas os do formData
    const updatedSettings: SettingsFormData = {
      ...settings as SettingsFormData,
      area_negocio: formData.area_negocio,
      foto_perfil: formData.foto_perfil,
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
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>
            Configure sua foto de perfil e área de negócio que aparecerão nos emails enviados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Foto de Perfil</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar className="h-24 w-24">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt="Foto de perfil" />
                ) : (
                  <AvatarFallback>DP</AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex flex-col gap-2 w-full">
                <Input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="max-w-xs"
                />
                {selectedFile && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUpload}
                    disabled={uploading}
                    className="max-w-xs"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Fazer upload'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area_negocio">Área de Negócio</Label>
            <Input
              id="area_negocio"
              placeholder="Ex: Marketing Digital | Consultoria de Vendas"
              value={formData.area_negocio || ''}
              onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Salvar dados pessoais
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
