import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings } from '@/hooks/useSettings';
import { Loader2, Save, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignaturePreview } from './SignaturePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmailSignature } from '@/hooks/useEmailSignature';

interface ProfileFormProps {
  onSave?: () => void;
}

export function ProfileForm({ onSave }: ProfileFormProps) {
  const { settings, loading, fetchSettings } = useSettings();
  const { uploadSignatureImage } = useEmailSignature();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    area_negocio: '',
    foto_perfil: '',
    smtp_nome: '',
    email_usuario: '',
    signature_image: '',
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Update form data when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        area_negocio: settings.area_negocio || '',
        foto_perfil: settings.foto_perfil || '',
        smtp_nome: settings.smtp_nome || '',
        email_usuario: settings.email_usuario || '',
        signature_image: settings.signature_image || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para salvar configurações');
      return;
    }
    
    setUploading(true);
    try {
      let updatedFormData = { ...formData };
      
      // Upload photo if selected
      if (photoFile) {
        const photoUrl = await uploadProfilePhoto(photoFile);
        if (photoUrl) {
          updatedFormData.foto_perfil = photoUrl;
        }
      }
      
      // Upload signature if selected
      if (signatureFile) {
        const signatureUrl = await uploadSignatureImage(signatureFile);
        if (signatureUrl) {
          updatedFormData.signature_image = signatureUrl;
        }
      }

      // FIXED: Only update profile-specific fields, preserving existing settings
      const { error } = await supabase
        .from('configuracoes')
        .update({
          area_negocio: updatedFormData.area_negocio || null,
          foto_perfil: updatedFormData.foto_perfil || null,
          smtp_nome: updatedFormData.smtp_nome || null,
          email_usuario: updatedFormData.email_usuario || null,
          signature_image: updatedFormData.signature_image || null,
          // Explicitly preserve existing SMTP settings by not including them in the update
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao salvar perfil:', error);
        toast.error('Erro ao salvar perfil: ' + error.message);
        return;
      }

      // Update local state
      setFormData(updatedFormData);
      
      // Refresh settings to get updated data
      await fetchSettings();
      
      toast.success('Perfil atualizado com sucesso!');
      
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil: ' + error.message);
    } finally {
      setUploading(false);
      setPhotoFile(null);
      setSignatureFile(null);
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    try {
      const filePath = `profile-photos/${user!.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
      return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'photo') {
        setPhotoFile(e.target.files[0]);
      } else {
        setSignatureFile(e.target.files[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando informações de perfil...</p>
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
            Atualize suas informações pessoais e de contato.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="signature">Assinatura de Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.foto_perfil || ''} alt="Foto de perfil" />
                  <AvatarFallback className="text-lg">
                    {formData.smtp_nome ? formData.smtp_nome.substring(0, 2).toUpperCase() : 'DP'}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <Label htmlFor="photo" className="block mb-2">Foto de Perfil</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      className="max-w-sm"
                      onChange={(e) => handleFileChange(e, 'photo')}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_nome">Nome Completo</Label>
                <Input
                  id="smtp_nome"
                  placeholder="Seu nome completo"
                  value={formData.smtp_nome || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_nome: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email_usuario">Email para Contato</Label>
                <Input
                  id="email_usuario"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={formData.email_usuario || ''}
                  onChange={(e) => setFormData({ ...formData, email_usuario: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="area_negocio">Área de Atuação</Label>
                <Input
                  id="area_negocio"
                  placeholder="Ex: Marketing Digital, E-commerce, Consultoria"
                  value={formData.area_negocio || ''}
                  onChange={(e) => setFormData({ ...formData, area_negocio: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Esta informação será utilizada na assinatura dos seus emails.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="signature" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Assinatura Digital</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione sua assinatura digital que será exibida automaticamente nos emails enviados
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signature">Imagem da Assinatura</Label>
                      <Input
                        id="signature"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'signature')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recomendado: assinatura em PNG com fundo transparente
                      </p>
                    </div>
                    
                    {formData.signature_image && (
                      <div className="border p-4 rounded-md">
                        <p className="text-sm font-medium mb-2">Assinatura atual:</p>
                        <img 
                          src={formData.signature_image} 
                          alt="Assinatura digital" 
                          className="max-h-20 object-contain" 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prévia da Assinatura</Label>
                    {settings && (
                      <SignaturePreview 
                        settings={{
                          ...settings,
                          smtp_nome: formData.smtp_nome || settings.smtp_nome,
                          email_usuario: formData.email_usuario || settings.email_usuario,
                          area_negocio: formData.area_negocio || settings.area_negocio,
                          signature_image: formData.signature_image || settings.signature_image
                        }} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" disabled={loading || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fazendo upload...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar perfil
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
