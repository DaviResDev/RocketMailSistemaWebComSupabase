
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EmailSignature {
  signature_image: string | null;
}

export function useEmailSignature() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const uploadSignatureImage = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload de imagens');
      return null;
    }

    try {
      setLoading(true);
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return null;
      }
      
      // Check file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
        toast.error('O arquivo deve ser uma imagem (JPG, PNG ou GIF)');
        return null;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `signature-${Date.now()}.${fileExt}`;
      const filePath = `signatures/${user.id}/${fileName}`;
      
      // Create bucket if it doesn't exist
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === 'profile_signatures');
        
        if (!bucketExists) {
          await supabase.storage.createBucket('profile_signatures', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
          });
        }
      } catch (error: any) {
        // Ignore error if bucket already exists
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }
      
      // Upload file
      const { data, error } = await supabase.storage
        .from('profile_signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_signatures')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error: any) {
      console.error('Erro ao fazer upload da assinatura:', error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    uploadSignatureImage
  };
}
