
import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  initialImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  allowMultiple?: boolean;
  maxFiles?: number;
}

export const ImageUploader = ({ 
  initialImageUrl, 
  onImageUploaded, 
  allowMultiple = false, 
  maxFiles = 10 
}: ImageUploaderProps) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - aumentado de 5MB
  const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];

  // Update local state when the initialImageUrl prop changes
  useEffect(() => {
    if (initialImageUrl) {
      setImageUrls([initialImageUrl]);
    }
  }, [initialImageUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the maximum
    if (allowMultiple && imageUrls.length + files.length > maxFiles) {
      toast.error(`Você pode enviar no máximo ${maxFiles} arquivos.`);
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`Arquivo ${file.name}: Tipo não suportado. Use PNG, JPG, JPEG, GIF, WEBP ou SVG.`);
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Arquivo ${file.name}: Muito grande. O tamanho máximo é 50MB.`);
          continue;
        }

        toast.loading(`Fazendo upload de ${file.name}...`);

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
        uploadedUrls.push(publicUrl);
        toast.dismiss();
      }

      if (uploadedUrls.length > 0) {
        if (allowMultiple) {
          const newUrls = [...imageUrls, ...uploadedUrls];
          setImageUrls(newUrls);
          onImageUploaded(newUrls.join(','));
        } else {
          setImageUrls([uploadedUrls[0]]);
          onImageUploaded(uploadedUrls[0]);
        }
        toast.success(`${uploadedUrls.length} imagem(ns) carregada(s) com sucesso!`);
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string, index?: number) => {
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

      if (allowMultiple && typeof index !== 'undefined') {
        const newUrls = imageUrls.filter((_, i) => i !== index);
        setImageUrls(newUrls);
        onImageUploaded(newUrls.join(','));
      } else {
        setImageUrls([]);
        onImageUploaded('');
      }
      
      toast.success('Imagem removida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover a imagem:', error);
      toast.error(`Erro ao remover a imagem: ${error.message}`);
    }
  };

  const displayUrls = allowMultiple ? imageUrls : (imageUrls.length > 0 ? [imageUrls[0]] : []);

  return (
    <div className="space-y-4">
      {displayUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 bg-muted/50">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">
            {allowMultiple 
              ? `Arraste imagens ou clique para fazer upload (máx. ${maxFiles} arquivos)`
              : 'Arraste uma imagem ou clique para fazer upload'
            }
          </p>
          <input
            type="file"
            id="image-upload"
            className="hidden"
            onChange={handleUpload}
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
            disabled={isUploading}
            multiple={allowMultiple}
          />
          <label htmlFor="image-upload">
            <Button variant="secondary" disabled={isUploading} type="button" className="cursor-pointer">
              {isUploading ? 'Carregando...' : 'Selecionar imagem(ns)'}
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Formatos suportados: PNG, JPG, JPEG, GIF, WEBP, SVG (máx. 50MB cada)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allowMultiple ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {displayUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Imagem ${index + 1}`}
                    className="rounded-md max-h-[150px] w-full object-cover border p-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(url, index)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative max-w-md mx-auto">
                <img
                  src={displayUrls[0]}
                  alt="Imagem do template"
                  className="rounded-md max-h-[200px] object-contain border p-2"
                />
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 justify-center">
            {allowMultiple && displayUrls.length < maxFiles && (
              <Button variant="outline" onClick={() => {
                const input = document.getElementById('image-upload') as HTMLInputElement;
                if (input) input.click();
              }} type="button">
                <Upload className="h-4 w-4 mr-2" /> Adicionar mais
              </Button>
            )}
            
            {!allowMultiple && (
              <Button variant="outline" onClick={() => {
                const input = document.getElementById('image-upload') as HTMLInputElement;
                if (input) input.click();
              }} type="button">
                <Upload className="h-4 w-4 mr-2" /> Trocar imagem
              </Button>
            )}
            
            <Button variant="destructive" onClick={() => {
              if (allowMultiple) {
                // Clear all images
                displayUrls.forEach((url, index) => handleDeleteImage(url, index));
              } else {
                handleDeleteImage(displayUrls[0]);
              }
            }} type="button">
              <Trash2 className="h-4 w-4 mr-2" /> 
              {allowMultiple ? 'Remover todas' : 'Remover'}
            </Button>
            
            <input
              type="file"
              id="image-upload"
              className="hidden"
              onChange={handleUpload}
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              disabled={isUploading}
              multiple={allowMultiple}
            />
          </div>
        </div>
      )}
    </div>
  );
};
