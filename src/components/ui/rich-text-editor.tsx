
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
  value?: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite seu texto aqui...',
  minHeight = '200px',
  className = '',
  onImageUpload
}: RichTextEditorProps) {
  const [editorContent, setEditorContent] = useState(value || '');
  const [isEmpty, setIsEmpty] = useState(!value || value === '');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Format commands that can be applied to selected text
  const formatText = (action: string) => {
    const editor = editorRef.current;
    if (!editor) return;

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
        document.execCommand('formatBlock', false, 'h3');
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
            document.execCommand('insertImage', false, imageUrl);
          }
        }
        break;
      case 'link':
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          setLinkText(selection.toString());
          setLinkUrl('https://');
          setLinkPopoverOpen(true);
        } else {
          setLinkText('');
          setLinkUrl('https://');
          setLinkPopoverOpen(true);
        }
        break;
      case 'unlink':
        document.execCommand('unlink', false);
        break;
    }

    // After applying format, update state
    if (editor) {
      setEditorContent(editor.innerHTML);
      checkIfEmpty(editor.innerHTML);
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
    checkIfEmpty(editor.innerHTML);
    onChange(editor.innerHTML);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImageUpload || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    try {
      const url = await onImageUpload(file);
      if (url) {
        document.execCommand('insertImage', false, url);
        
        // Update state
        if (editorRef.current) {
          setEditorContent(editorRef.current.innerHTML);
          setIsEmpty(false);
          onChange(editorRef.current.innerHTML);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      setIsEmpty(false);
    }
  };

  // Check if the editor content is empty
  const checkIfEmpty = (content: string) => {
    const isContentEmpty = !content || 
                          content === '' || 
                          content === '<p></p>' || 
                          content === '<p><br></p>' || 
                          content === '<br>';
    setIsEmpty(isContentEmpty);
  };

  // Handle changes in the editor content
  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    setEditorContent(content);
    checkIfEmpty(content);
    onChange(content);
  };

  // Handle paste to strip formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Synchronize with external value change
  useEffect(() => {
    if (value !== undefined && value !== editorContent) {
      setEditorContent(value);
      checkIfEmpty(value);
    }
  }, [value]);

  // Initial check for empty content
  useEffect(() => {
    checkIfEmpty(editorContent);
  }, []);

  return (
    <div className={`border rounded-md bg-background ${className}`}>
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
          <span className="font-bold text-sm">H3</span>
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
          onClick={() => formatText('unlink')}
        >
          <Unlink className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="relative">
        <div
          ref={editorRef}
          className="p-4 focus:outline-none"
          contentEditable="true"
          dangerouslySetInnerHTML={{ __html: editorContent }}
          onInput={handleEditorChange}
          onFocus={handleEditorFocus}
          onPaste={handlePaste}
          style={{ 
            minHeight, 
            direction: 'ltr',
            textAlign: 'left'
          }}
          dir="ltr"
          data-placeholder={placeholder}
        />
        {isEmpty && (
          <div 
            className="absolute top-0 left-0 p-4 pointer-events-none text-muted-foreground"
            style={{ minHeight }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
