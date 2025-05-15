
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  if (!userId) {
    toast.error('Você precisa estar logado para fazer upload de fotos');
    return null;
  }

  // Upload the photo to Supabase Storage
  const filePath = `profile-photos/${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file');
  }

  // Return the public URL
  return urlData.publicUrl;
}
