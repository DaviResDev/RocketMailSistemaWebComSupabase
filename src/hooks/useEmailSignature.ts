
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
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt || '')) {
        throw new Error('Formato de arquivo não suportado. Use JPG, PNG, GIF, WEBP ou SVG');
      }
      
      // Criar nome de arquivo único com o ID do usuário
      const fileName = `sig_${user.id}_${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Fazer o upload para o bucket 'signatures'
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
      const errorMsg = error.message || 'Erro ao fazer upload da assinatura';
      toast.error(`Erro ao fazer upload da assinatura: ${errorMsg}`);
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
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete file directly (no path needed)
      const { error } = await supabase.storage
        .from('signatures')
        .remove([fileName]);

      if (error) throw error;

      toast.success('Imagem de assinatura removida com sucesso');
      return true;
    } catch (error: any) {
      toast.error(`Erro ao remover a assinatura: ${error.message}`);
      console.error('Error deleting signature image:', error);
      return false;
    }
  };

  const getSignatureUrl = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('signature_image')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      return data?.signature_image || null;
    } catch (error) {
      console.error('Error fetching signature URL:', error);
      return null;
    }
  };

  return {
    uploadSignatureImage,
    deleteSignatureImage,
    getSignatureUrl,
    uploading
  };
};
