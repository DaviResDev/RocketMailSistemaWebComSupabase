
import { useState, useCallback } from 'react';
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
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 2MB');
      }
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt || '')) {
        throw new Error('Formato de arquivo não suportado. Use JPG, PNG, GIF, WEBP ou SVG');
      }
      
      // Criar nome de arquivo único com o ID do usuário
      const fileName = `signature_${user.id}_${uuidv4()}.${fileExt}`;
      
      console.log('Uploading signature to bucket "signatures" with filename:', fileName);
      
      // Fazer o upload para o bucket 'signatures' (bucket já criado via SQL)
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      console.log("Signature image uploaded successfully:", publicUrl);
      
      // Salvar URL da assinatura nas configurações do usuário
      const { data: settingsData, error: settingsError } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error checking existing settings:', settingsError);
        throw new Error('Erro ao verificar configurações existentes');
      }
        
      if (settingsData) {
        // Atualizar configurações existentes
        const { error: updateError } = await supabase
          .from('configuracoes')
          .update({ signature_image: publicUrl })
          .eq('id', settingsData.id);
          
        if (updateError) {
          console.error('Error updating signature URL in settings:', updateError);
          throw new Error('Erro ao salvar a URL da assinatura nas configurações');
        }
      } else {
        // Criar nova entrada de configurações
        const { error: insertError } = await supabase
          .from('configuracoes')
          .insert({
            user_id: user.id,
            signature_image: publicUrl
          });
          
        if (insertError) {
          console.error('Error creating settings with signature URL:', insertError);
          throw new Error('Erro ao criar configurações com a assinatura');
        }
      }
      
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
      // Extrair nome do arquivo da URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      console.log('Deleting signature file:', fileName);

      // Deletar arquivo do bucket signatures
      const { error } = await supabase.storage
        .from('signatures')
        .remove([fileName]);

      if (error) {
        console.error('Storage delete error:', error);
        throw error;
      }
      
      // Remover também das configurações do usuário
      const { error: updateError } = await supabase
        .from('configuracoes')
        .update({ signature_image: null })
        .eq('user_id', user.id);
        
      if (updateError) {
        console.error('Error removing signature from settings:', updateError);
        throw new Error('Erro ao remover a assinatura das configurações');
      }

      toast.success('Imagem de assinatura removida com sucesso');
      return true;
    } catch (error: any) {
      toast.error(`Erro ao remover a assinatura: ${error.message}`);
      console.error('Error deleting signature image:', error);
      return false;
    }
  };

  const getSignatureUrl = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('signature_image')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("No settings found for user");
          return null;
        }
        throw error;
      }
      
      console.log("Retrieved signature from settings:", data?.signature_image);
      return data?.signature_image || null;
    } catch (error) {
      console.error('Error fetching signature URL:', error);
      return null;
    }
  }, [user]);

  return {
    uploadSignatureImage,
    deleteSignatureImage,
    getSignatureUrl,
    uploading
  };
};
