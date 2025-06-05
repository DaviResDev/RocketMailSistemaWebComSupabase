
import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  initialImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
}

export const ImageUploader = ({ initialImageUrl, onImageUploaded }: ImageUploaderProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];

  // Update local state when the initialImageUrl prop changes
  useEffect(() => {
    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PNG, JPG, JPEG, GIF, WEBP ou SVG.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. O tamanho máximo é 5MB.');
      return;
    }

    setIsUploading(true);
    toast.loading('Fazendo upload da imagem...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      console.log('Starting upload to Supabase storage...');

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('template-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, getting public URL...');

      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(filePath);

      console.log('Public URL obtained:', publicUrl);

      setImageUrl(publicUrl);
      onImageUploaded(publicUrl);
      toast.dismiss();
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      toast.dismiss();
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error(`Erro ao fazer upload da imagem: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageUrl) return;

    try {
      // Extract file path from the URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = user?.id;
      const filePath = `${userId}/${fileName}`;

      console.log('Deleting file from storage:', filePath);

      // Delete file from storage
      const { error } = await supabase.storage
        .from('template-images')
        .remove([filePath]);

      if (error) throw error;

      setImageUrl(null);
      onImageUploaded('');
      toast.success('Imagem removida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover a imagem:', error);
      toast.error(`Erro ao remover a imagem: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {!imageUrl ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 bg-muted/50">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">Arraste uma imagem ou clique para fazer upload</p>
          <input
            type="file"
            id="image-upload"
            className="hidden"
            onChange={handleUpload}
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
            disabled={isUploading}
          />
          <label htmlFor="image-upload">
            <Button variant="secondary" disabled={isUploading} type="button" className="cursor-pointer">
              {isUploading ? 'Carregando...' : 'Selecionar imagem'}
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Formatos suportados: PNG, JPG, JPEG, GIF, WEBP, SVG (máx. 5MB)
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative max-w-md mx-auto">
            <img
              src={imageUrl}
              alt="Imagem do template"
              className="rounded-md max-h-[200px] object-contain border p-2"
            />
          </div>
          <div className="flex mt-4 space-x-2">
            <Button variant="outline" onClick={() => {
              const input = document.getElementById('image-upload') as HTMLInputElement;
              if (input) input.click();
            }} type="button">
              <Upload className="h-4 w-4 mr-2" /> Trocar imagem
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage} type="button">
              <Trash2 className="h-4 w-4 mr-2" /> Remover
            </Button>
            <input
              type="file"
              id="image-upload"
              className="hidden"
              onChange={handleUpload}
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              disabled={isUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
};
