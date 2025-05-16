import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { RichTextEditor } from './RichTextEditor';
import { Template, TemplateFormData } from '@/types/template';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemplateFormProps } from './TemplateFormProps';
import { useEmailSignature } from '@/hooks/useEmailSignature';
import { useSettings } from '@/hooks/useSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateFileUpload } from './TemplateFileUpload';
import { TemplatePreview } from './TemplatePreview';

const templateSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  descricao: z.string().optional(),
  conteudo: z.string().min(1, { message: 'Conteúdo é obrigatório' }),
  canal: z.string(),
  status: z.string().default('ativo'),
  assinatura: z.string(),
  signature_image: z.string().optional().nullable(),
  attachments: z.any().optional(),
  template_file: z.any().optional(),
  template_file_url: z.string().optional().nullable(),
  template_file_name: z.string().optional().nullable()
});

export const TemplateForm = ({ template, isEditing, onSave, onCancel, onSendTest }: TemplateFormProps) => {
  const { settings } = useSettings();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [templateFileUrl, setTemplateFileUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const { signatureOptions } = useEmailSignature();
  const [useSignature, setUseSignature] = useState(!!template?.assinatura && template?.assinatura !== 'não');
  const [shouldUseSignature, setShouldUseSignature] = useState(!!template?.assinatura && template?.assinatura !== 'não');

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nome: template?.nome || '',
      descricao: template?.descricao || '',
      conteudo: template?.conteudo || '',
      canal: template?.canal || 'email',
      status: template?.status || 'ativo',
      assinatura: template?.assinatura || 'não',
      signature_image: template?.signature_image || settings?.signature_image || null,
      attachments: template?.attachments || [],
      template_file: template?.template_file || null,
      template_file_url: template?.template_file_url || null,
      template_file_name: template?.template_file_name || null
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
        assinatura: template.assinatura || 'não',
        signature_image: template.signature_image || settings?.signature_image || null,
        attachments: template.attachments || [],
        template_file: null, // Clear the file input
        template_file_url: (template as any).template_file_url || null,
        template_file_name: (template as any).template_file_name || null
      });
      
      // Initialize attachments if they exist
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
      
      // Initialize template file info
      setTemplateFileUrl((template as any).template_file_url || null);
      setTemplateFileName((template as any).template_file_name || null);
      setUseSignature(template.assinatura !== 'não');
      setShouldUseSignature(template.assinatura !== 'não');
    } else {
      // Reset form and clear attachments when creating a new template
      form.reset();
      setAttachments([]);
      setTemplateFileUrl(null);
      setTemplateFileName(null);
      setUseSignature(false);
      setShouldUseSignature(false);
    }
  }, [template, form, settings]);

  const handleTemplateFileChange = (file: File | null) => {
    setTemplateFile(file);
    form.setValue('template_file', file);
  };

  const handleAttachmentChange = (newAttachments: any[]) => {
    setAttachments(newAttachments);
    form.setValue('attachments', newAttachments);
  };

  const handleSignatureChange = (value: boolean) => {
    setUseSignature(value);
    setShouldUseSignature(value);
    form.setValue('assinatura', value ? 'sim' : 'não');
  };

  async function onSubmit(values: TemplateFormData) {
    try {
      // Set attachments to the form data
      values.attachments = attachments;
      
      // Set signature usage
      values.assinatura = useSignature ? 'sim' : 'não';
      
      // Set template file
      values.template_file = templateFile;
      values.template_file_url = templateFileUrl;
      values.template_file_name = templateFileName;
      
      // Set signature image
      values.signature_image = shouldUseSignature ? values.signature_image : null;
      
      console.log('Enviando dados do formulário:', values);
      
      const success = await onSave(values);
      
      if (success) {
        form.reset();
        setAttachments([]);
        setTemplateFile(null);
        setTemplateFileUrl(null);
        setTemplateFileName(null);
        setUseSignature(false);
        setShouldUseSignature(false);
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
    signature_image: template?.signature_image || settings?.signature_image || null,
    attachments: template?.attachments || '[]'
  });

  // Update preview when form values change
  useEffect(() => {
    const formValues = form.getValues();
    setPreviewTemplate({
      ...previewTemplate,
      nome: formValues.nome,
      conteudo: formValues.conteudo,
      signature_image: shouldUseSignature 
        ? (formValues.signature_image || settings?.signature_image || null) 
        : null,
    });
  }, [form.watch('nome'), form.watch('conteudo'), shouldUseSignature]);

  return (
    <div>
      <Form {...form}>
        <Card className="w-full">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <CardFooter className="flex justify-between items-center bg-gray-100 border-t">
            <h2 className="text-lg font-semibold">Editor de Template</h2>
            <div className="flex space-x-2">
              {onSendTest && (
                <Button type="button" variant="outline" onClick={() => onSendTest(template?.id || '')}>
                  Enviar Teste
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Visualização</TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor" className="space-y-4">
            <Card className="w-full">
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="conteudo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo</FormLabel>
                      <FormControl>
                        <RichTextEditor value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card className="w-full">
              <CardContent className="space-y-4">
                <TemplateFileUpload
                  attachments={attachments}
                  onChange={handleAttachmentChange}
                />
              </CardContent>
            </Card>
            
            <Card className="w-full">
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="assinatura"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Usar assinatura?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={shouldUseSignature}
                          onCheckedChange={(checked) => {
                            handleSignatureChange(checked);
                            setShouldUseSignature(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {shouldUseSignature && (
                  <FormField
                    control={form.control}
                    name="signature_image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imagem da Assinatura</FormLabel>
                        <Select
                          disabled={!shouldUseSignature}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSignatureImage(value);
                          }}
                          defaultValue={form.getValues('signature_image') || settings?.signature_image || 'default'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a assinatura" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {signatureOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
            
            <Card className="w-full">
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="template_file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arquivo de Template</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const file = e.target.files[0];
                              handleTemplateFileChange(file);
                              setTemplateFileName(file.name);
                              setTemplateFileUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </FormControl>
                      {templateFileName && (
                        <p className="text-sm text-gray-500">
                          Arquivo selecionado: {templateFileName}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="mb-6">
              <TemplatePreview template={previewTemplate} />
            </div>
          </TabsContent>
        </Tabs>

        <Card className="w-full">
          <CardFooter className="flex justify-between items-center bg-gray-100 border-t">
            <h2 className="text-lg font-semibold">Ações</h2>
            <div className="flex space-x-2">
              {onSendTest && (
                <Button type="button" variant="outline" onClick={() => onSendTest(template?.id || '')}>
                  Enviar Teste
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </Form>
    </div>
  );
};
