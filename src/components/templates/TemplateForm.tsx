
import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import RichTextEditor from './RichTextEditor';
import { Template, TemplateFormData } from '@/types/template';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemplateFormProps } from './TemplateFormProps';
import { useEmailSignature } from '@/hooks/useEmailSignature';
import { useSettings } from '@/hooks/useSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatePreview } from './TemplatePreview';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SaveIcon, Send, FileText, PencilIcon, Variable } from "lucide-react";
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';

const templateSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  descricao: z.string().optional(),
  conteudo: z.string().min(1, { message: 'Conteúdo é obrigatório' }),
  canal: z.string(),
  status: z.string().default('ativo'),
  assinatura: z.string(),
  signature_image: z.string().optional().nullable(),
  attachments: z.any().optional(),
  image_url: z.string().optional().nullable()
});

const VARIABLES = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'data', label: 'Data' },
  { key: 'hora', label: 'Hora' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'produto', label: 'Produto' },
  { key: 'valor', label: 'Valor' },
  { key: 'vencimento', label: 'Vencimento' }
];

export const TemplateForm = ({ template, isEditing, onSave, onCancel, onSendTest }: TemplateFormProps) => {
  const { settings } = useSettings();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const { uploadSignatureImage, deleteSignatureImage } = useEmailSignature();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Always use signature from settings
  const [useSignature, setUseSignature] = useState(true);
  const [shouldUseSignature, setShouldUseSignature] = useState(true);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nome: template?.nome || '',
      descricao: template?.descricao || '',
      conteudo: template?.conteudo || '',
      canal: template?.canal || 'email',
      status: template?.status || 'ativo',
      assinatura: 'sim', // Always use signature
      signature_image: settings?.signature_image || 'default_signature', // Always use from settings
      attachments: template?.attachments || [],
      image_url: template?.image_url || null,
    },
    mode: 'onChange'
  });

  useEffect(() => {
    if (template) {
      form.reset({
        nome: template.nome,
        descricao: template.descricao || '',
        conteudo: template.conteudo,
        canal: template.canal || 'email',
        status: template.status || 'ativo',
        assinatura: 'sim', // Always use signature
        signature_image: settings?.signature_image || 'default_signature', // Always use signature from settings
        attachments: template.attachments || [],
        image_url: template.image_url || null,
      });
      
      if (template.attachments) {
        try {
          const parsedAttachments = JSON.parse(template.attachments as string);
          setAttachments(parsedAttachments);
        } catch (e) {
          console.error('Erro ao analisar anexos:', e);
          setAttachments([]);
        }
      } else {
        setAttachments([]);
      }
      
      setUseSignature(true);
      setShouldUseSignature(true);
    } else {
      form.reset();
      setAttachments([]);
      setUseSignature(true);
      setShouldUseSignature(true);
    }
  }, [template, form, settings]);

  const handleAttachmentChange = (newAttachments: any[]) => {
    setAttachments(newAttachments);
    form.setValue('attachments', newAttachments);
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const newAttachments = [...attachments];
    let hasErrors = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`O arquivo ${file.name} excede o tamanho máximo de 10MB`);
        hasErrors = true;
        continue;
      }
      
      try {
        toast.loading(`Fazendo upload de ${file.name}...`);
        
        // Upload file to Supabase
        const { data, error } = await supabase.storage
          .from('template_attachments')
          .upload(`attachments/${Date.now()}-${file.name}`, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('template_attachments')
          .getPublicUrl(data.path);
        
        newAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrl,
          path: data.path
        });
        
        toast.success(`Arquivo ${file.name} carregado com sucesso`);
      } catch (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        toast.error(`Erro ao fazer upload do arquivo ${file.name}`);
        hasErrors = true;
      }
    }
    
    if (!hasErrors) {
      handleAttachmentChange(newAttachments);
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const attachmentToRemove = attachments[index];
    const newAttachments = [...attachments];
    
    try {
      // If the attachment has a path, remove it from storage
      if (attachmentToRemove.path) {
        await supabase.storage
          .from('template_attachments')
          .remove([attachmentToRemove.path]);
      }
      
      newAttachments.splice(index, 1);
      handleAttachmentChange(newAttachments);
      toast.success('Anexo removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast.error('Erro ao remover anexo');
    }
  };

  const insertVariable = (variable: string) => {
    if (editorInstance) {
      editorInstance.insertContent(`{{${variable}}}`);
    }
  };

  async function onSubmit(values: TemplateFormData) {
    try {
      values.attachments = attachments;
      values.assinatura = 'sim'; // Always use signature
      values.signature_image = settings?.signature_image || 'default_signature'; // Always use signature from settings
      
      console.log('Enviando dados do formulário:', values);
      
      const success = await onSave(values);
      
      if (success) {
        form.reset();
        setAttachments([]);
      }
      
      return success;
    } catch (error) {
      console.error('Erro ao salvar o template:', error);
      return false;
    }
  }

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<Partial<Template>>({
    nome: template?.nome || '',
    descricao: template?.descricao || '',
    conteudo: template?.conteudo || '',
    signature_image: settings?.signature_image || 'default_signature',
    attachments: template?.attachments || '[]',
    image_url: template?.image_url || null
  });

  // Update preview when form values change
  useEffect(() => {
    const formValues = form.getValues();
    setPreviewTemplate({
      ...previewTemplate,
      nome: formValues.nome,
      descricao: formValues.descricao || '',
      conteudo: formValues.conteudo,
      signature_image: settings?.signature_image || 'default_signature',
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : '[]'
    });
  }, [form.watch('nome'), form.watch('descricao'), form.watch('conteudo'), settings, attachments]);

  return (
    <Form {...form}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do template" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do template"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Conteúdo do Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rich text editor with variable insertion button */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Conteúdo</h3>
                <div className="flex space-x-2">
                  {/* Variables popover button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <Variable className="mr-1 h-4 w-4" />
                        Inserir Variáveis
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2">
                      <div className="space-y-1">
                        {VARIABLES.map((variable) => (
                          <Button 
                            key={variable.key}
                            variant="ghost" 
                            size="sm"
                            className="w-full justify-start" 
                            onClick={() => insertVariable(variable.key)}
                          >
                            {variable.label}: {`{{${variable.key}}}`}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* File attachment button */}
                  <Button
                    variant="outline" 
                    size="sm"
                    className="flex items-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    Anexar Arquivos
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e.target.files)}
                  />
                </div>
              </div>
              
              {/* Editor */}
              <FormField
                control={form.control}
                name="conteudo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                        onEditorInit={setEditorInstance}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="p-4 border rounded-md bg-muted/50">
                <h4 className="text-sm font-medium mb-2">Anexos ({attachments.length})</h4>
                <ul className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-sm truncate flex-1">
                        📎 {attachment.name || 'Arquivo'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Preview section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplatePreview template={previewTemplate} />
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <div className="space-x-2">
            {onSendTest && template?.id && (
              <Button type="button" variant="outline" onClick={() => onSendTest(template.id)}>
                <Send className="w-4 h-4 mr-2" />Enviar Teste
              </Button>
            )}
            <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
              <SaveIcon className="w-4 h-4 mr-2" />{isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
};
