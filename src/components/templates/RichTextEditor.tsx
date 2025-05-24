
import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Unlink,
  RotateCcw,
  RotateCw,
  Type,
  Trash2,
  ChevronDown,
  Variable
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Define o tipo para as variáveis do template
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

// Define as opções de fonte
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' }
];

// Define tamanhos de fonte
const FONT_SIZES = [
  { label: 'Pequeno', value: '12px' },
  { label: 'Normal', value: '16px' },
  { label: 'Médio', value: '20px' },
  { label: 'Grande', value: '24px' },
  { label: 'Enorme', value: '30px' }
];

interface RichTextEditorProps {
  value?: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onEditorInit?: (editor: any) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  onEditorInit,
  placeholder = 'Digite o conteúdo do template aqui...',
  className = '',
  minHeight = '300px'
}: RichTextEditorProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configurar o editor TipTap com todas as extensões necessárias
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: false,
  });

  // Sincronização do valor externo
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Expor o editor para o componente pai
  useEffect(() => {
    if (editor && onEditorInit) {
      onEditorInit(editor);
    }
  }, [editor, onEditorInit]);

  // Função para inserir uma variável no editor
  const insertVariable = (variableKey: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`{{${variableKey}}}`).run();
    }
  };

  // Função para inserir um link
  const insertLink = () => {
    if (!linkUrl.trim()) return;
    
    if (editor) {
      // Se houver texto selecionado, aplique o link a ele
      if (editor.state.selection.content().size > 0) {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: linkUrl, target: '_blank' })
          .run();
      } 
      // Se não houver texto selecionado mas houver texto de link definido
      else if (linkText.trim()) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}" target="_blank">${linkText}</a>`)
          .run();
      }
      // Caso não haja nem texto selecionado nem definido, use a URL como texto
      else {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}" target="_blank">${linkUrl}</a>`)
          .run();
      }
    }
    
    setLinkPopoverOpen(false);
    setLinkUrl('https://');
    setLinkText('');
  };

  // Função para remover um link
  const removeLink = () => {
    if (editor) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
  };

  // Função para lidar com o upload de imagens
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImageUpload || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    try {
      toast.loading('Enviando imagem...');
      const url = await onImageUpload(file);
      if (url && editor) {
        editor.chain().focus().setImage({ src: url, alt: 'Imagem do template' }).run();
        toast.success('Imagem enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast.error('Erro ao enviar imagem. Tente novamente.');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para iniciar o processo de upload de imagem
  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para aplicar uma família de fonte
  const applyFontFamily = (fontFamily: string) => {
    if (editor) {
      editor.chain().focus().setFontFamily(fontFamily).run();
    }
  };

  // Função para aplicar um tamanho de fonte usando CSS
  const applyFontSize = (fontSize: string) => {
    if (editor) {
      editor.chain().focus().setMark('textStyle', { fontSize }).run();
    }
  };

  // Função para limpar toda a formatação
  const clearFormatting = () => {
    if (editor) {
      editor.chain().focus().clearNodes().unsetAllMarks().run();
    }
  };

  // Se o editor não estiver inicializado, não renderize nada
  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-md bg-background ${className}`}>
      {/* Barra de ferramentas */}
      <div className="bg-muted/40 p-1 border-b flex flex-wrap items-center gap-1">
        {/* Formatação de texto básica */}
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        {/* Dropdown de tamanho de fonte */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Type className="h-4 w-4 mr-1" />
              <span className="text-xs">Tamanho</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem 
                key={size.value}
                onClick={() => applyFontSize(size.value)}
              >
                <span style={{ fontSize: size.value }}>{size.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Dropdown de família de fonte */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <span className="text-xs">Fonte</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem 
                key={font.value}
                onClick={() => applyFontFamily(font.value)}
              >
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        {/* Alinhamento */}
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        {/* Listas */}
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        {/* Imagem e Links */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={triggerImageUpload}
        >
          <ImageIcon className="h-4 w-4" />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            accept="image/*"
          />
        </Button>
        
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('link') ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (editor.isActive('link')) {
                  removeLink();
                } else {
                  setLinkUrl('https://');
                  setLinkText(editor.state.selection.content().content?.size 
                    ? '' 
                    : '');
                  setLinkPopoverOpen(true);
                }
              }}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-4" align="start">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="link-text">Texto do Link</Label>
                  <Input
                    id="link-text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Texto a ser exibido"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="link-url">URL do Link</Label>
                  <Input
                    id="link-url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://exemplo.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setLinkPopoverOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={insertLink}>
                  Inserir Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={removeLink}
          disabled={!editor.isActive('link')}
        >
          <Unlink className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        {/* Desfazer / Refazer / Limpar Formatação */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={clearFormatting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        {/* Dropdown de variáveis */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Variable className="h-4 w-4 mr-1" />
              <span className="text-xs">Variáveis</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {VARIABLES.map((variable) => (
              <DropdownMenuItem 
                key={variable.key}
                onClick={() => insertVariable(variable.key)}
              >
                {variable.label} <code className="ml-2 text-xs">{`{{${variable.key}}}`}</code>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Área do Editor */}
      <div className="relative" style={{ minHeight }}>
        <EditorContent 
          editor={editor} 
          className="p-4 focus:outline-none min-h-[200px] prose prose-sm max-w-none" 
        />
        {editor && editor.isEmpty && (
          <div className="absolute top-0 left-0 p-4 text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
