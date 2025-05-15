
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export const useEmailSignature = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const uploadSignatureImage = async (file: File) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar uma imagem de assinatura');
      return null;
    }

    try {
      setUploading(true);
      
      // Validações básicas
      if (file.size > 2 * 1024 * 1024) { // 2MB max
        throw new Error('Arquivo muito grande. Tamanho máximo: 2MB');
      }
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif'].includes(fileExt || '')) {
        throw new Error('Formato de arquivo não suportado. Use JPG, PNG ou GIF');
      }
      
      // Criar nome de arquivo único
      const fileName = `signature_${user.id}_${uuidv4()}.${fileExt}`;
      const filePath = `signatures/${fileName}`;
      
      // Verificar se o bucket existe ou criar
      const { data: buckets } = await supabase.storage.listBuckets();
      const signaturesBucket = buckets?.find(b => b.name === 'signatures');
      
      if (!signaturesBucket) {
        // Se não existir, notificar que é necessário criar o bucket
        console.warn('Bucket "signatures" não encontrado');
        throw new Error('Configuração de armazenamento incompleta. Entre em contato com o suporte.');
      }
      
      // Fazer o upload
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Sobrescrever se existir
        });
        
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);
      
      toast.success('Imagem de assinatura enviada com sucesso!');
      return publicUrl;
    } catch (error: any) {
      toast.error(`Erro ao fazer upload da assinatura: ${error.message}`);
      console.error('Error uploading signature image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteSignatureImage = async (imageUrl: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para gerenciar sua assinatura');
      return false;
    }

    try {
      // Extract path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `signatures/${fileName}`;

      const { error } = await supabase.storage
        .from('signatures')
        .remove([filePath]);

      if (error) throw error;

      toast.success('Imagem de assinatura removida com sucesso');
      return true;
    } catch (error: any) {
      toast.error(`Erro ao remover a assinatura: ${error.message}`);
      console.error('Error deleting signature image:', error);
      return false;
    }
  };

  return {
    uploadSignatureImage,
    deleteSignatureImage,
    uploading
  };
};
