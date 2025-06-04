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

// FIXED: Custom FontSize extension with proper implementation
const FontSize = TextStyle.extend({
  name: 'fontSize',
  
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => {
          return element.style.fontSize?.replace(/['"]+/g, '') || null;
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

  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
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
  { value: '10px', label: '10px' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '22px', label: '22px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '42px', label: '42px' },
  { value: '48px', label: '48px' },
  { value: '56px', label: '56px' },
  { value: '64px', label: '64px' },
  { value: '72px', label: '72px' }
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
      FontSize, // Nossa extensão corrigida
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

  // CRITICAL: Inject proper styles for font rendering
  useEffect(() => {
    const styleId = 'rich-text-editor-fixed-styles';
    
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&display=swap';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* FIXED: Rich Text Editor Content Styles with proper font size rendering */
      .rich-text-content .ProseMirror {
        outline: none !important;
        color: inherit !important;
        background: transparent !important;
        min-height: ${minHeight};
        padding: 16px;
      }
      
      .rich-text-content .ProseMirror p,
      .rich-text-content .ProseMirror h1,
      .rich-text-content .ProseMirror h2,
      .rich-text-content .ProseMirror h3,
      .rich-text-content .ProseMirror h4,
      .rich-text-content .ProseMirror h5,
      .rich-text-content .ProseMirror h6,
      .rich-text-content .ProseMirror ul,
      .rich-text-content .ProseMirror ol,
      .rich-text-content .ProseMirror li {
        color: inherit !important;
      }
      
      /* CRITICAL: Force font-size to render properly */
      .rich-text-content .ProseMirror span[style*="font-size"] {
        display: inline !important;
        line-height: 1.2 !important;
      }
      
      /* CRITICAL: Ensure all font families render correctly */
      .rich-text-content .ProseMirror span[style*="font-family"] {
        display: inline !important;
      }
      
      /* Template preview must also respect font sizes */
      .template-preview-content span[style*="font-size"] {
        display: inline !important;
        line-height: 1.2 !important;
      }
      
      .template-preview-content span[style*="font-family"] {
        display: inline !important;
      }
      
      /* Force specific font families */
      ${FONT_FAMILIES.map(font => `
        .rich-text-content .ProseMirror span[style*="font-family: '${font.label}'"],
        .rich-text-content .ProseMirror span[style*="font-family: ${font.label}"],
        .template-preview-content span[style*="font-family: '${font.label}'"],
        .template-preview-content span[style*="font-family: ${font.label}"] {
          font-family: ${font.value} !important;
        }
      `).join('')}
      
      /* Placeholder styling */
      .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #999999;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      
      /* Dark mode support */
      [data-theme="dark"] .rich-text-content .ProseMirror,
      .dark .rich-text-content .ProseMirror {
        color: #e0e0e0 !important;
      }
      
      [data-theme="dark"] .rich-text-content .ProseMirror p.is-editor-empty:first-child::before,
      .dark .rich-text-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #aaaaaa !important;
      }
    `;
    
    document.head.appendChild(style);

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

  // FIXED: Font family function with better implementation
  const setFontFamily = (fontFamily: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) {
      alert('Por favor, selecione o texto que deseja alterar a fonte primeiro.');
      return;
    }

    editor
      .chain()
      .focus()
      .setFontFamily(fontFamily)
      .run();
    
    // Force update
    setTimeout(() => {
      const newHTML = editor.getHTML();
      onChange(newHTML);
      editor.view.updateState(editor.state);
    }, 100);
  };

  // FIXED: Font size function with proper implementation
  const setFontSize = (size: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) {
      alert('Por favor, selecione o texto que deseja alterar o tamanho primeiro.');
      return;
    }

    // Use nossa extensão customizada
    editor
      .chain()
      .focus()
      .setFontSize(size)
      .run();
    
    // Force content update and re-render
    setTimeout(() => {
      const newHTML = editor.getHTML();
      console.log('Font size applied:', size, 'New HTML:', newHTML);
      onChange(newHTML);
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

        {/* FIXED: Font Size Selector */}
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
                    console.log('Setting font size to:', size.value);
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
                    console.log('Setting font family to:', font.value);
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
