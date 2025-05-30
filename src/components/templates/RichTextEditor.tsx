
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
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon, List, ListOrdered, Quote, Code, Undo, Redo, Variable } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
      FontFamily,
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
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none`,
        style: `min-height: ${minHeight}; color: inherit; background: transparent;`,
      },
    },
  });

  // Inject global styles for dark mode support
  useEffect(() => {
    const styleId = 'rich-text-editor-styles';
    
    // Remove existing styles if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject new styles
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .rich-text-editor-content .ProseMirror {
        outline: none !important;
        color: inherit !important;
        background: transparent !important;
        min-height: ${minHeight};
      }
      
      .rich-text-editor-content .ProseMirror p {
        color: inherit !important;
        margin: 0.5em 0;
      }
      
      .rich-text-editor-content .ProseMirror h1,
      .rich-text-editor-content .ProseMirror h2,
      .rich-text-editor-content .ProseMirror h3,
      .rich-text-editor-content .ProseMirror h4,
      .rich-text-editor-content .ProseMirror h5,
      .rich-text-editor-content .ProseMirror h6 {
        color: inherit !important;
      }
      
      .rich-text-editor-content .ProseMirror ul,
      .rich-text-editor-content .ProseMirror ol {
        color: inherit !important;
      }
      
      .rich-text-editor-content .ProseMirror a {
        color: hsl(var(--primary)) !important;
      }
      
      .rich-text-editor-content .ProseMirror blockquote {
        border-left: 4px solid hsl(var(--border));
        padding-left: 1rem;
        margin: 1rem 0;
        color: inherit !important;
      }
      
      .rich-text-editor-content .ProseMirror code {
        background: hsl(var(--muted));
        color: inherit !important;
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
      }
      
      /* Dark mode specific improvements */
      [data-theme="dark"] .rich-text-editor-content .ProseMirror,
      .dark .rich-text-editor-content .ProseMirror {
        color: #e0e0e0 !important;
      }
      
      [data-theme="dark"] .rich-text-editor-content .ProseMirror p,
      .dark .rich-text-editor-content .ProseMirror p {
        color: #e0e0e0 !important;
      }
      
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h1,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h2,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h3,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h4,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h5,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror h6,
      .dark .rich-text-editor-content .ProseMirror h1,
      .dark .rich-text-editor-content .ProseMirror h2,
      .dark .rich-text-editor-content .ProseMirror h3,
      .dark .rich-text-editor-content .ProseMirror h4,
      .dark .rich-text-editor-content .ProseMirror h5,
      .dark .rich-text-editor-content .ProseMirror h6 {
        color: #ffffff !important;
      }
      
      [data-theme="dark"] .rich-text-editor-content .ProseMirror ul,
      [data-theme="dark"] .rich-text-editor-content .ProseMirror ol,
      .dark .rich-text-editor-content .ProseMirror ul,
      .dark .rich-text-editor-content .ProseMirror ol {
        color: #e0e0e0 !important;
      }
      
      /* Placeholder styling for dark mode */
      [data-theme="dark"] .rich-text-editor-content .ProseMirror p.is-editor-empty:first-child::before,
      .dark .rich-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #aaaaaa !important;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      
      .rich-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
        color: #999999;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(style);

    // Cleanup function to remove styles when component unmounts
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

      {/* Editor Content with improved dark mode styles */}
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className="rich-text-editor-content"
        />
      </div>
    </div>
  );
};
