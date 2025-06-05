
import React, { useState } from 'react';
import { Upload, File, Trash2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '@/components/ui/card';

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
}

interface MultipleFileUploaderProps {
  initialAttachments?: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // em MB
}

export const MultipleFileUploader = ({ 
  initialAttachments = [], 
  onAttachmentsChange,
  maxFiles = 10, // Aumentado para 10 arquivos
  maxFileSize = 25 // Aumentado para 25MB por arquivo
}: MultipleFileUploaderProps) => {
  const [attachments, setAttachments] = useState<FileAttachment[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const MAX_FILE_SIZE = maxFileSize * 1024 * 1024; // Converter MB para bytes
  const ALLOWED_FILE_TYPES = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Imagens
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Arquivos compactados
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  const uploadFileToStorage = async (file: File): Promise<FileAttachment> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;
    
    console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
    
    const { error: uploadError } = await supabase.storage
      .from('template_attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('template_attachments')
      .getPublicUrl(filePath);
      
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: publicUrl,
      path: filePath
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Verificar se não ultrapassa o limite de arquivos
    if (attachments.length + files.length > maxFiles) {
      toast.error(`Você pode anexar no máximo ${maxFiles} arquivos.`);
      return;
    }

    setIsUploading(true);
    const uploadToast = toast.loading(`Fazendo upload de ${files.length} arquivo(s)...`);

    try {
      const newAttachments: FileAttachment[] = [];
      
      // Processar cada arquivo sequencialmente para evitar conflitos
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de arquivo
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`Tipo de arquivo não suportado: ${file.name}`);
          continue;
        }
        
        // Validar tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Arquivo muito grande: ${file.name} (máx. ${maxFileSize}MB)`);
          continue;
        }
        
        try {
          const uploadedFile = await uploadFileToStorage(file);
          newAttachments.push(uploadedFile);
          console.log(`Successfully uploaded: ${file.name}`);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }
      
      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments];
        setAttachments(updatedAttachments);
        onAttachmentsChange(updatedAttachments);
        toast.dismiss(uploadToast);
        toast.success(`${newAttachments.length} arquivo(s) carregado(s) com sucesso!`);
      } else {
        toast.dismiss(uploadToast);
        toast.error('Nenhum arquivo foi carregado com sucesso.');
      }
    } catch (error: any) {
      toast.dismiss(uploadToast);
      console.error('Erro no upload dos arquivos:', error);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setIsUploading(false);
      // Clear the input to allow re-uploading
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      // Remover do storage
      const { error } = await supabase.storage
        .from('template_attachments')
        .remove([attachment.path]);
        
      if (error) {
        console.error('Error removing file from storage:', error);
      }
      
      // Remover da lista
      const updatedAttachments = attachments.filter((_, i) => i !== index);
      setAttachments(updatedAttachments);
      onAttachmentsChange(updatedAttachments);
      
      toast.success('Arquivo removido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '🗜️';
    return '📎';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 bg-muted/50">
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground mb-4">
          Arraste arquivos ou clique para fazer upload
        </p>
        <input
          type="file"
          id="multiple-file-upload"
          className="hidden"
          onChange={handleFileUpload}
          multiple
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.7z"
        />
        <label htmlFor="multiple-file-upload">
          <Button variant="secondary" disabled={isUploading || attachments.length >= maxFiles} type="button" className="cursor-pointer">
            {isUploading ? 'Carregando...' : 'Selecionar arquivos'}
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Máximo: {maxFiles} arquivos, {maxFileSize}MB cada<br/>
          Formatos: PDF, DOC, XLS, PPT, TXT, CSV, Imagens, ZIP, RAR, 7Z
        </p>
        <p className="text-xs text-muted-foreground">
          {attachments.length}/{maxFiles} arquivos anexados
        </p>
      </div>

      {/* Lista de arquivos anexados */}
      {attachments.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <Paperclip className="h-4 w-4 mr-2" />
              Arquivos Anexados ({attachments.length})
            </h4>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-lg">{getFileIcon(attachment.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={attachment.name}>
                        {attachment.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAttachment(index)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
