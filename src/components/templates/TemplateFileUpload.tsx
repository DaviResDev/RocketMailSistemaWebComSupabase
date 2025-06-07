
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, X, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface TemplateFileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string) => void;
  attachments?: UploadedFile[];
  onChange?: (newAttachments: UploadedFile[]) => void;
}

export function TemplateFileUpload({ onFileUploaded, attachments = [], onChange }: TemplateFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Supported file types for template upload
  const supportedFileTypes = [
    'text/html', 'text/plain', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/json', 'text/markdown',
    'application/zip', 'application/pdf', 
    'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'
  ];

  // File extensions for display
  const supportedExtensions = '.html, .txt, .docx, .json, .md, .zip, .pdf, .jpg, .jpeg, .png, .svg, .webp';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("Você precisa estar logado para enviar arquivos");
      }

      const uploadedFiles: UploadedFile[] = [];

      // Upload multiple files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check if file type is supported
        if (!supportedFileTypes.includes(file.type)) {
          toast.error(`Tipo de arquivo não suportado: ${file.name}`);
          continue;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo muito grande: ${file.name}. Tamanho máximo: 10MB`);
          continue;
        }

        // Create unique filename with original extension
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('template_files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Erro ao enviar ${file.name}:`, uploadError);
          toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('template_files')
          .getPublicUrl(filePath);

        const uploadedFileInfo: UploadedFile = {
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type
        };

        uploadedFiles.push(uploadedFileInfo);
        
        // Call onFileUploaded for each file (for backward compatibility)
        onFileUploaded(publicUrl, file.name);
      }

      if (uploadedFiles.length > 0) {
        // Update attachments if onChange handler is provided
        if (onChange) {
          const newAttachments = [...attachments, ...uploadedFiles];
          onChange(newAttachments);
        }
        
        toast.success(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
      }

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('Erro ao enviar arquivos:', error);
      setError(error.message || 'Erro ao fazer upload dos arquivos');
      toast.error(`Erro ao enviar arquivos: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    if (onChange) {
      const newAttachments = attachments.filter((_, i) => i !== index);
      onChange(newAttachments);
      toast.success('Arquivo removido');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="template-files" className="block text-sm font-medium mb-1">
          Adicionar arquivos anexos
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Formatos aceitos: {supportedExtensions}
        </p>
      </div>

      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          className="relative cursor-pointer"
          disabled={isUploading}
        >
          <input
            id="template-files"
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept=".html,.txt,.docx,.json,.md,.zip,.pdf,.jpg,.jpeg,.png,.svg,.webp"
            multiple
          />
          {isUploading ? (
            <>Enviando...</>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Adicionar arquivos
            </>
          )}
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Arquivos anexados:</p>
          {attachments.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex justify-between items-center">
                <div className="flex items-center">
                  <File className="h-5 w-5 mr-2 text-blue-500" />
                  <div className="text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive flex items-center mt-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="text-sm text-green-600 flex items-center mt-1">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          {attachments.length} arquivo(s) anexado(s)
        </div>
      )}
    </div>
  );
}
