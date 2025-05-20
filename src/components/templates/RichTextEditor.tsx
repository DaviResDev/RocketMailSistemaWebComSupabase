import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
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
  Type
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Define action types for the formatting toolbar
type ActionType = 
  | 'bold' 
  | 'italic' 
  | 'underline' 
  | 'heading' 
  | 'align-left' 
  | 'align-center' 
  | 'align-right' 
  | 'align-justify'
  | 'list-unordered'
  | 'list-ordered'
  | 'image'
  | 'link'
  | 'unlink'
  | 'undo';

interface RichTextEditorProps {
  id?: string;
  initialValue?: string;
  value?: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onEditorInit?: (editor: HTMLElement) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

// Export as a named export, not default export
export function RichTextEditor({
  id = 'rich-text-editor',
  initialValue = '',
  value,
  onChange,
  onImageUpload,
  onEditorInit,
  placeholder = 'Digite o conteúdo aqui...',
  className = '',
  minHeight = '200px'
}: RichTextEditorProps) {
  const [editorContent, setEditorContent] = useState(initialValue || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isLinkEdit, setIsLinkEdit] = useState(false);

  // Format commands that can be applied to selected text
  const formatText = (action: ActionType) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Get the current selection - defined once at the top level of the function
    const currentSelection = window.getSelection();
    
    switch (action) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'heading':
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          const selectedText = range.toString();
          
          if (selectedText) {
            document.execCommand('insertHTML', false, `<h3>${selectedText}</h3>`);
          } else {
            document.execCommand('insertHTML', false, '<h3>Título</h3>');
          }
        } else {
          document.execCommand('insertHTML', false, '<h3>Título</h3>');
        }
        break;
      case 'align-left':
        document.execCommand('justifyLeft', false);
        break;
      case 'align-center':
        document.execCommand('justifyCenter', false);
        break;
      case 'align-right':
        document.execCommand('justifyRight', false);
        break;
      case 'align-justify':
        document.execCommand('justifyFull', false);
        break;
      case 'list-unordered':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'list-ordered':
        document.execCommand('insertOrderedList', false);
        break;
      case 'image':
        if (onImageUpload) {
          triggerImageUpload();
        } else {
          const imageUrl = prompt('Digite a URL da imagem:');
          if (imageUrl) {
            insertImage(imageUrl);
          }
        }
        break;
      case 'link':
        if (currentSelection && currentSelection.toString()) {
          setLinkText(currentSelection.toString());
          setLinkUrl('https://');
          setIsLinkEdit(false);
          setLinkPopoverOpen(true);
        } else {
          setLinkText('');
          setLinkUrl('https://');
          setIsLinkEdit(false);
          setLinkPopoverOpen(true);
        }
        break;
      case 'unlink':
        document.execCommand('unlink', false);
        break;
      case 'undo':
        document.execCommand('undo', false);
        break;
    }

    // After applying format, update state
    if (editor) {
      setEditorContent(editor.innerHTML);
      onChange(editor.innerHTML);
    }
  };

  // Insert link using the URL from popover
  const insertLink = () => {
    if (!linkUrl.trim()) return;
    
    const editor = editorRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    if (selection) {
      // If no text is selected but link text is provided, insert new link
      if ((!selection.toString() || selection.toString() === '') && linkText) {
        document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank">${linkText}</a>`);
      } 
      // If text is selected, wrap it in link
      else if (selection.toString()) {
        document.execCommand('createLink', false, linkUrl);
        const links = editor.querySelectorAll('a');
        links.forEach(link => {
          link.setAttribute('target', '_blank');
        });
      }
      // No selection and no link text, just insert the URL as a link
      else {
        document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank">${linkUrl}</a>`);
      }
    }
    
    setLinkPopoverOpen(false);
    setLinkUrl('');
    setLinkText('');
    
    // Update state
    setEditorContent(editor.innerHTML);
    onChange(editor.innerHTML);
  };

  // Insert image at cursor position
  const insertImage = (url: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagem" style="max-width: 100%; height: auto;" />`);
    
    // Update state
    setEditorContent(editor.innerHTML);
    onChange(editor.innerHTML);
  };

  // Inline image upload handling
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImageUpload || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    try {
      const url = await onImageUpload(file);
      if (url) {
        insertImage(url);
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

  // Init content with proper direction
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.dir = 'ltr';
      
      // Apply a global CSS style to ensure LTR
      const styleEl = document.createElement('style');
      styleEl.id = 'ltr-editor-style';
      styleEl.textContent = `
        #${id}, #${id} * {
          direction: ltr !important;
          text-align: start !important;
        }
      `;
      document.head.appendChild(styleEl);
      
      if (onEditorInit) {
        onEditorInit(editorRef.current);
      }
      
      return () => {
        const styleToRemove = document.getElementById('ltr-editor-style');
        if (styleToRemove) {
          document.head.removeChild(styleToRemove);
        }
      };
    }
  }, [id, onEditorInit]);

  // Synchronize editor content with state
  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    setEditorContent(content);
    onChange(content);
  };

  // Synchronize with external value change
  useEffect(() => {
    if (value !== undefined && value !== editorContent) {
      setEditorContent(value);
    }
  }, [value, editorContent]);
  
  // Hidden file input for image upload
  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Focus editor when it's empty and receives focus
  const handleEditorFocus = () => {
    if (editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = '<p><br></p>';
    }
  };

  // Handle paste to strip formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('insertHTML', false, text);
    }
  };

  return (
    <div className={`border rounded-md bg-background ${className}`} style={{ direction: 'ltr' }}>
      <div className="bg-muted/40 p-1 border-b flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('underline')}
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('heading')}
        >
          <Type className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('align-left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('align-center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('align-right')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('align-justify')}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('list-unordered')}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('list-ordered')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('image')}
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
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatText('link')}
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
                  {isLinkEdit ? 'Atualizar' : 'Inserir'} Link
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
          onClick={() => formatText('unlink')}
        >
          <Unlink className="h-4 w-4" />
        </Button>
        
        <span className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => formatText('undo')}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor with explicit LTR direction */}
      <div
        id={id}
        ref={editorRef}
        className="p-4 focus:outline-none min-h-[200px]"
        contentEditable="true"
        dangerouslySetInnerHTML={{ __html: editorContent }}
        onInput={handleEditorChange}
        onFocus={handleEditorFocus}
        onPaste={handlePaste}
        dir="ltr"
        style={{ 
          direction: 'ltr',
          textAlign: 'left',
          minHeight
        }}
      />
    </div>
  );
}

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`}
        {...props}
      />
    )
  }
)
Label.displayName = "Label"
