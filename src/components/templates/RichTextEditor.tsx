
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon, List, ListOrdered, Quote, Code, Undo, Redo, Variable, Type, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Custom FontSize extension that properly extends TextStyle - FIXED VERSION
const FontSize = TextStyle.extend({
  name: 'fontSize',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => {
          const fontSize = element.style.fontSize;
          return fontSize ? fontSize.replace(/['"]+/g, '') : null;
        },
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
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

const FONT_SIZES = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px' }
];

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' }
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEditorInit?: (editor: any) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onEditorInit,
  onImageUpload,
  placeholder = "Digite o conteúdo aqui...",
  minHeight = "200px"
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize, // Our custom FontSize extension
      Placeholder.configure({
        placeholder,
        emptyNodeClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none rich-text-content`,
        style: `min-height: ${minHeight}; color: inherit; background: transparent;`,
      },
    },
  });

  // Inject Google Fonts and styles for proper font rendering
  useEffect(() => {
    const styleId = 'rich-text-editor-styles';
    
    // Remove existing styles if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add Google Fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&display=swap';
    document.head.appendChild(fontLink);

    // Create and inject styles
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Rich Text Editor Content Styles - FIXED FONT RENDERING */
      .rich-text-content .ProseMirror {
        outline: none !important;
        color: inherit !important;
        background: transparent !important;
        min-height: ${minHeight};
        padding: 16px;
      }
      
      .rich-text-content .ProseMirror p {
        color: inherit !important;
        margin: 0.5em 0;
      }
      
      .rich-text-content .ProseMirror h1,
      .rich-text-content .ProseMirror h2,
      .rich-text-content .ProseMirror h3,
      .rich-text-content .ProseMirror h4,
      .rich-text-content .ProseMirror h5,
      .rich-text-content .ProseMirror h6 {
        color: inherit !important;
      }
      
      .rich-text-content .ProseMirror ul,
      .rich-text-content .ProseMirror ol {
        color: inherit !important;
      }
      
      .rich-text-content .ProseMirror a {
        color: hsl(var(--primary)) !important;
      }
      
      .rich-text-content .ProseMirror blockquote {
        border-left: 4px solid hsl(var(--border));
        padding-left: 1rem;
        margin: 1rem 0;
        color: inherit !important;
      }
      
      .rich-text-content .ProseMirror code {
        background: hsl(var(--muted));
        color: inherit !important;
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
      }
      
      /* CRITICAL: Font family and size must override ALL other styles */
      .rich-text-content .ProseMirror span[style*="font-family"] {
        display: inline !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-size"] {
        display: inline !important;
      }
      
      /* Ensure all styled spans render properly */
      .rich-text-content .ProseMirror span[style] {
        display: inline !important;
      }
      
      /* FORCE font families to render correctly */
      .rich-text-content .ProseMirror * {
        font-family: inherit;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Arial'"],
      .rich-text-content .ProseMirror span[style*="font-family: Arial"] {
        font-family: Arial, sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Helvetica'"],
      .rich-text-content .ProseMirror span[style*="font-family: Helvetica"] {
        font-family: Helvetica, sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Times New Roman'"],
      .rich-text-content .ProseMirror span[style*="font-family: Times New Roman"] {
        font-family: "Times New Roman", serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Georgia'"],
      .rich-text-content .ProseMirror span[style*="font-family: Georgia"] {
        font-family: Georgia, serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Verdana'"],
      .rich-text-content .ProseMirror span[style*="font-family: Verdana"] {
        font-family: Verdana, sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Roboto'"],
      .rich-text-content .ProseMirror span[style*="font-family: Roboto"] {
        font-family: "Roboto", sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Open Sans'"],
      .rich-text-content .ProseMirror span[style*="font-family: Open Sans"] {
        font-family: "Open Sans", sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Lato'"],
      .rich-text-content .ProseMirror span[style*="font-family: Lato"] {
        font-family: "Lato", sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Montserrat'"],
      .rich-text-content .ProseMirror span[style*="font-family: Montserrat"] {
        font-family: "Montserrat", sans-serif !important;
      }
      
      .rich-text-content .ProseMirror span[style*="font-family: 'Poppins'"],
      .rich-text-content .ProseMirror span[style*="font-family: Poppins"] {
        font-family: "Poppins", sans-serif !important;
      }
      
      /* Template preview styles - for font consistency */
      .template-preview-content {
        font-family: inherit;
      }
      
      .template-preview-content span[style*="font-family"] {
        display: inline !important;
      }
      
      .template-preview-content span[style*="font-size"] {
        display: inline !important;
      }
      
      /* CRITICAL: Preview must also respect font families */
      .template-preview-content span[style*="font-family: 'Arial'"],
      .template-preview-content span[style*="font-family: Arial"] {
        font-family: Arial, sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Helvetica'"],
      .template-preview-content span[style*="font-family: Helvetica"] {
        font-family: Helvetica, sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Times New Roman'"],
      .template-preview-content span[style*="font-family: Times New Roman"] {
        font-family: "Times New Roman", serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Georgia'"],
      .template-preview-content span[style*="font-family: Georgia"] {
        font-family: Georgia, serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Verdana'"],
      .template-preview-content span[style*="font-family: Verdana"] {
        font-family: Verdana, sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Roboto'"],
      .template-preview-content span[style*="font-family: Roboto"] {
        font-family: "Roboto", sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Open Sans'"],
      .template-preview-content span[style*="font-family: Open Sans"] {
        font-family: "Open Sans", sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Lato'"],
      .template-preview-content span[style*="font-family: Lato"] {
        font-family: "Lato", sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Montserrat'"],
      .template-preview-content span[style*="font-family: Montserrat"] {
        font-family: "Montserrat", sans-serif !important;
      }
      
      .template-preview-content span[style*="font-family: 'Poppins'"],
      .template-preview-content span[style*="font-family: Poppins"] {
        font-family: "Poppins", sans-serif !important;
      }
      
      /* Dark mode specific improvements */
      [data-theme="dark"] .rich-text-content .ProseMirror,
      .dark .rich-text-content .ProseMirror {
        color: #e0e0e0 !important;
      }
      
      [data-theme="dark"] .rich-text-content .ProseMirror p,
      .dark .rich-text-content .ProseMirror p {
        color: #e0e0e0 !important;
      }
      
      [data-theme="dark"] .rich-text-content .ProseMirror h1,
      [data-theme="dark"] .rich-text-content .ProseMirror h2,
      [data-theme="dark"] .rich-text-content .ProseMirror h3,
      [data-theme="dark"] .rich-text-content .ProseMirror h4,
      [data-theme="dark"] .rich-text-content .ProseMirror h5,
      [data-theme="dark"] .rich-text-content .ProseMirror h6,
      .dark .rich-text-content .ProseMirror h1,
      .dark .rich-text-content .ProseMirror h2,
      .dark .rich-text-content .ProseMirror h3,
      .dark .rich-text-content .ProseMirror h4,
      .dark .rich-text-content .ProseMirror h5,
      .dark .rich-text-content .ProseMirror h6 {
        color: #ffffff !important;
      }
      
      /* Placeholder styling */
      .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #999999;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      
      [data-theme="dark"] .rich-text-content .ProseMirror p.is-editor-empty:first-child::before,
      .dark .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #aaaaaa !important;
      }
    `;
    
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [minHeight]);

  useEffect(() => {
    if (editor && onEditorInit) {
      onEditorInit(editor);
    }
  }, [editor, onEditorInit]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const insertVariable = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`{{${variable}}}`).run();
    }
  };

  // IMPROVED: Font family function with better error handling
  const setFontFamily = (fontFamily: string) => {
    if (!editor) {
      console.log('Editor not available');
      return;
    }

    console.log('Setting font family:', fontFamily);
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) {
      console.log('No text selected - prompting user to select text first');
      alert('Por favor, selecione o texto que deseja alterar a fonte primeiro.');
      return;
    }

    // Use TipTap's setFontFamily command correctly
    const success = editor
      .chain()
      .focus()
      .setFontFamily(fontFamily)
      .run();
    
    console.log('Font family command result:', success);
    
    // Force content update and re-render
    setTimeout(() => {
      const newHTML = editor.getHTML();
      console.log('Updated HTML after fontFamily:', newHTML);
      onChange(newHTML);
      
      // Force editor to refresh view
      editor.view.updateState(editor.state);
    }, 100);
  };

  // IMPROVED: Font size function using our custom extension
  const setFontSize = (size: string) => {
    if (!editor) {
      console.log('Editor not available');
      return;
    }

    console.log('Setting font size:', size);
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) {
      console.log('No text selected - prompting user to select text first');
      alert('Por favor, selecione o texto que deseja alterar o tamanho primeiro.');
      return;
    }

    // Use our custom fontSize attribute via textStyle mark
    const success = editor
      .chain()
      .focus()
      .setMark('textStyle', { fontSize: size })
      .run();
    
    console.log('Font size command result:', success);
    
    // Force content update and re-render
    setTimeout(() => {
      const newHTML = editor.getHTML();
      console.log('Updated HTML after fontSize:', newHTML);
      onChange(newHTML);
      
      // Force editor to refresh view
      editor.view.updateState(editor.state);
    }, 100);
  };

  const addLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImageUpload) {
        try {
          const url = await onImageUpload(file);
          editor?.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    };
    input.click();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-muted' : ''}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Size Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-w-[80px]"
            >
              <Type className="h-4 w-4 mr-1" />
              Tamanho
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="grid gap-1">
              <div className="text-sm font-medium mb-2">Tamanho da Fonte</div>
              {FONT_SIZES.map((size) => (
                <Button
                  key={size.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    console.log('Font size button clicked:', size.value);
                    setFontSize(size.value);
                  }}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Family Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-w-[70px]"
            >
              <Palette className="h-4 w-4 mr-1" />
              Fonte
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="grid gap-1">
              <div className="text-sm font-medium mb-2">Família da Fonte</div>
              {FONT_FAMILIES.map((font) => (
                <Button
                  key={font.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  style={{ fontFamily: font.value }}
                  onClick={() => {
                    console.log('Font family button clicked:', font.value);
                    setFontFamily(font.value);
                  }}
                >
                  {font.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        
        {onImageUpload && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addImage}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
            >
              <Variable className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="grid gap-1">
              <div className="text-sm font-medium mb-2">Inserir Variável</div>
              {VARIABLES.map((variable) => (
                <Button
                  key={variable.key}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => insertVariable(variable.key)}
                >
                  {`{{${variable.key}}}`} - {variable.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="p-0">
        <EditorContent 
          editor={editor} 
          className="rich-text-content"
        />
      </div>
    </div>
  );
};
