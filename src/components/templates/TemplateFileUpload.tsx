
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

interface TemplateFileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string) => void;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export function TemplateFileUpload({ onFileUploaded }: TemplateFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file type is supported
    if (!supportedFileTypes.includes(file.type)) {
      setError(`Tipo de arquivo não suportado. Por favor, envie um dos seguintes formatos: ${supportedExtensions}`);
      toast.error(`Tipo de arquivo não suportado: ${file.type}`);
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Tamanho máximo: 10MB");
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("Você precisa estar logado para enviar arquivos");
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

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('template_files')
        .getPublicUrl(filePath);

      const uploadedFileInfo = {
        name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type
      };

      setUploadedFile(uploadedFileInfo);
      onFileUploaded(publicUrl, file.name);
      toast.success(`Arquivo ${file.name} enviado com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao enviar arquivo:', error);
      setError(error.message || 'Erro ao fazer upload do arquivo');
      toast.error(`Erro ao enviar arquivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
    // We don't actually delete the file from storage here - that will be handled
    // if the user discards the template or it gets replaced
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="template-file" className="block text-sm font-medium mb-1">
          Adicionar arquivo de template
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Formatos aceitos: {supportedExtensions}
        </p>
      </div>

      {!uploadedFile ? (
        <div className="flex items-center">
          <Button
            type="button"
            variant="outline"
            className="relative cursor-pointer"
            disabled={isUploading}
          >
            <input
              id="template-file"
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".html,.txt,.docx,.json,.md,.zip,.pdf,.jpg,.jpeg,.png,.svg,.webp"
            />
            {isUploading ? (
              <>Enviando...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Escolher arquivo
              </>
            )}
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-3 flex justify-between items-center">
            <div className="flex items-center">
              <File className="h-5 w-5 mr-2 text-blue-500" />
              <div className="text-sm">
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="text-sm text-destructive flex items-center mt-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {uploadedFile && (
        <div className="text-sm text-green-600 flex items-center mt-1">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Arquivo adicionado com sucesso
        </div>
      )}
    </div>
  );
}
