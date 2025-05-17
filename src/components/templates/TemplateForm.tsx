
import React, { useState, useEffect } from 'react';
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
import { ImageUploader } from './ImageUploader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SaveIcon, Send, Image, PencilIcon } from "lucide-react";

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

export const TemplateForm = ({ template, isEditing, onSave, onCancel, onSendTest }: TemplateFormProps) => {
  const { settings } = useSettings();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const { uploadSignatureImage, deleteSignatureImage } = useEmailSignature();
  
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
      
      setImageUrl(template.image_url || null);
      setUseSignature(true);
      setShouldUseSignature(true);
    } else {
      form.reset();
      setAttachments([]);
      setImageUrl(null);
      setUseSignature(true);
      setShouldUseSignature(true);
    }
  }, [template, form, settings]);

  const handleAttachmentChange = (newAttachments: any[]) => {
    setAttachments(newAttachments);
    form.setValue('attachments', newAttachments);
  };

  const handleImageUploaded = (url: string) => {
    setImageUrl(url);
    form.setValue('image_url', url);
  };

  async function onSubmit(values: TemplateFormData) {
    try {
      values.attachments = attachments;
      values.assinatura = 'sim'; // Always use signature
      values.signature_image = settings?.signature_image || 'default_signature'; // Always use signature from settings
      values.image_url = imageUrl;
      
      console.log('Enviando dados do formulário:', values);
      
      const success = await onSave(values);
      
      if (success) {
        form.reset();
        setAttachments([]);
        setImageUrl(null);
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
      conteudo: formValues.conteudo,
      signature_image: settings?.signature_image || 'default_signature',
      image_url: imageUrl
    });
  }, [form.watch('nome'), form.watch('conteudo'), imageUrl, settings]);

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
            {/* Image uploader component - above the content editor */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Imagem do Template</h3>
              <ImageUploader 
                initialImageUrl={imageUrl} 
                onImageUploaded={handleImageUploaded} 
              />
            </div>
            
            {/* Rich text editor */}
            <div>
              <h3 className="text-sm font-medium mb-2">Conteúdo</h3>
              <FormField
                control={form.control}
                name="conteudo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                        onEditorInit={(editor) => setEditorInstance(editor)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
