
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface TemplateFileUploadProps {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // em MB
  allowedTypes?: string[];
}

export const TemplateFileUpload: React.FC<TemplateFileUploadProps> = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 10,
  maxSizePerFile = 10,
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Função para validar arquivo individual
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Verifica tipo
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo não permitido: ${file.type}`
      };
    }

    // Verifica tamanho
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizePerFile) {
      return {
        valid: false,
        error: `Arquivo muito grande: ${sizeInMB.toFixed(1)}MB (máximo: ${maxSizePerFile}MB)`
      };
    }

    return { valid: true };
  };

  // Função para fazer upload de um arquivo
  const uploadSingleFile = async (file: File): Promise<FileAttachment | null> => {
    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      const formData = new FormData();
      formData.append('file', file);

      // Simula progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
        }));
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.statusText}`);
      }

      const data = await response.json();

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      return {
        name: file.name,
        url: data.url,
        type: file.type,
        size: file.size
      };

    } catch (error: any) {
      console.error(`Erro no upload de ${file.name}:`, error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
      
      throw new Error(`Falha no upload de "${file.name}": ${error.message}`);
    }
  };

  // Handler para seleção de arquivos
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Verifica limite total de arquivos
    if (attachments.length + files.length > maxFiles) {
      toast.error(`Limite de ${maxFiles} arquivos excedido`);
      return;
    }

    setUploading(true);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Processa cada arquivo
      for (const file of files) {
        try {
          // Valida arquivo
          const validation = validateFile(file);
          if (!validation.valid) {
            errors.push(`${file.name}: ${validation.error}`);
            errorCount++;
            continue;
          }

          // Verifica se já existe arquivo com mesmo nome
          if (attachments.some(att => att.name === file.name)) {
            errors.push(`${file.name}: Arquivo já existe`);
            errorCount++;
            continue;
          }

          console.log(`📎 Iniciando upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

          // Faz upload
          const uploadedFile = await uploadSingleFile(file);
          
          if (uploadedFile) {
            // Adiciona à lista de anexos
            onAttachmentsChange([...attachments, uploadedFile]);
            successCount++;
            
            console.log(`✅ Upload concluído: ${file.name}`);
          }

        } catch (error: any) {
          console.error(`❌ Erro no upload de ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
          errorCount++;
        }
      }

      // Feedback final
      if (successCount > 0) {
        toast.success(`✅ ${successCount} arquivo${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''} com sucesso!`, {
          duration: 4000
        });
      }

      if (errorCount > 0) {
        const errorMessage = errors.slice(0, 3).join('\n');
        const moreErrors = errors.length > 3 ? `\n... e mais ${errors.length - 3} erro${errors.length - 3 > 1 ? 's' : ''}` : '';
        
        toast.error(`❌ ${errorCount} arquivo${errorCount > 1 ? 's' : ''} falharam:`, {
          description: errorMessage + moreErrors,
          duration: 8000
        });
      }

    } finally {
      setUploading(false);
      setUploadProgress({});
      
      // Limpa o input para permitir selecionar os mesmos arquivos novamente
      event.target.value = '';
    }
  }, [attachments, onAttachmentsChange, maxFiles, maxSizePerFile, allowedTypes]);

  // Handler para remover arquivo
  const handleRemoveFile = useCallback((index: number) => {
    const fileToRemove = attachments[index];
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
    
    toast.success(`Arquivo "${fileToRemove.name}" removido`);
    console.log(`🗑️ Arquivo removido: ${fileToRemove.name}`);
  }, [attachments, onAttachmentsChange]);

  // Formata tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="file-upload" className="text-sm font-medium">
          Anexos do Template
        </Label>
        <span className="text-xs text-gray-500">
          {attachments.length}/{maxFiles} arquivos | Máx: {maxSizePerFile}MB cada
        </span>
      </div>

      {/* Input para seleção de arquivos */}
      <div className="flex items-center space-x-2">
        <Input
          id="file-upload"
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={uploading || attachments.length >= maxFiles}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading || attachments.length >= maxFiles}
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>
            {uploading ? 'Enviando...' : 'Selecionar Arquivos'}
          </span>
        </Button>

        {uploading && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processando uploads...</span>
          </div>
        )}
      </div>

      {/* Lista de arquivos */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Arquivos Anexados:</Label>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    {file.size && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    )}
                  </div>

                  {/* Indicador de status */}
                  <div className="flex-shrink-0">
                    {uploadProgress[file.name] !== undefined ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${uploadProgress[file.name]}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {uploadProgress[file.name]}%
                        </span>
                      </div>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                  className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informações de tipos permitidos */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <strong>Tipos permitidos:</strong> PDF, Word, Excel, Imagens (JPG, PNG, GIF), TXT
      </div>
    </div>
  );
};

export default TemplateFileUpload;
