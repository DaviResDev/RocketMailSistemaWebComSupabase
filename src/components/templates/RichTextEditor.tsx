
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ListOrdered,
  List,
  Link,
  Image,
  Paintbrush
} from 'lucide-react';
import { 
  Button
} from "@/components/ui/button";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEditorInit?: (editorElement: any) => void;
}

const fontSizes = [
  '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px'
];

const fontFamilies = [
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Trebuchet MS'
];

const textColors = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const bgColors = [
  'transparent', '#ffffff', '#f3f3f3', '#efefef', '#d9d9d9', '#cccccc', '#b7b7b7', '#999999', '#666666', '#434343', '#000000',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder,
  onEditorInit 
}: RichTextEditorProps) => {
  const [editorContent, setEditorContent] = useState(value || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Function to apply basic formatting commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editorEl = document.getElementById('rich-text-editor');
    if (editorEl) {
      onChange(editorEl.innerHTML);
      setEditorContent(editorEl.innerHTML);
    }
  }, [onChange]);
  
  // Apply font family
  const applyFontFamily = (fontFamily: string) => {
    execCommand('fontName', fontFamily);
  };
  
  // Apply font size
  const applyFontSize = (fontSize: string) => {
    const sizeMapping: { [key: string]: string } = {
      '10px': '1', '12px': '2', '14px': '3', '16px': '4',
      '18px': '5', '20px': '5', '24px': '6', '28px': '6',
      '32px': '7', '36px': '7', '48px': '7', '64px': '7'
    };
    execCommand('fontSize', sizeMapping[fontSize] || '3');
    
    // Apply CSS for more precise sizing
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = fontSize;
      
      try {
        range.surroundContents(span);
      } catch (e) {
        console.error('Erro ao aplicar tamanho de fonte:', e);
      }
      
      const editorEl = document.getElementById('rich-text-editor');
      if (editorEl) {
        onChange(editorEl.innerHTML);
        setEditorContent(editorEl.innerHTML);
      }
    }
  };
  
  // Apply text color
  const applyTextColor = (color: string) => {
    execCommand('foreColor', color);
  };
  
  // Apply background color
  const applyBgColor = (color: string) => {
    execCommand('hiliteColor', color);
  };
  
  // Insert link
  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkPopover(false);
    }
  };

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) {
      return;
    }

    const file = files[0];
    const fileExt = file.name.split('.').pop();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!allowedTypes.includes(fileExt?.toLowerCase() || '')) {
      toast.error('Tipo de arquivo não suportado. Use imagens: jpg, jpeg, png, gif ou webp');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('A imagem é muito grande. O tamanho máximo é 5MB');
      return;
    }

    toast.loading('Enviando imagem...');
    
    try {
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('template-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(filePath);
      
      // Insert image at current cursor position
      const imageHtml = `<img src="${publicUrl}" alt="Imagem" style="max-width: 100%; margin: 10px 0;" />`;
      
      // Insert at beginning of content if no selection
      const editorEl = document.getElementById('rich-text-editor');
      const sel = window.getSelection();
      
      if (editorEl) {
        if (sel && !sel.isCollapsed) {
          // Insert at current selection
          execCommand('insertHTML', imageHtml);
        } else {
          // Insert at the beginning of the content
          const oldContent = editorEl.innerHTML;
          editorEl.innerHTML = imageHtml + oldContent;
          onChange(editorEl.innerHTML);
          setEditorContent(editorEl.innerHTML);
        }
      }
      
      toast.dismiss();
      toast.success('Imagem inserida com sucesso!');
      
      // Reset file input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erro ao enviar imagem: ${error.message || 'Falha no upload'}`);
      console.error('Erro ao enviar imagem:', error);
    }
  };

  // Insert image from URL
  const insertImageFromUrl = () => {
    if (imageUrl) {
      const imageHtml = `<img src="${imageUrl}" alt="Imagem" style="max-width: 100%; margin: 10px 0;" />`;
      
      // Insert at beginning of content if no selection
      const editorEl = document.getElementById('rich-text-editor');
      const sel = window.getSelection();
      
      if (editorEl) {
        if (sel && !sel.isCollapsed) {
          // Insert at current selection
          execCommand('insertHTML', imageHtml);
        } else {
          // Insert at the beginning of the content
          const oldContent = editorEl.innerHTML;
          editorEl.innerHTML = imageHtml + oldContent;
          onChange(editorEl.innerHTML);
          setEditorContent(editorEl.innerHTML);
        }
      }
      
      setImageUrl('');
    }
  };

  // Force LTR for all content in the editor
  const forceLTRForEditor = useCallback(() => {
    if (!editorRef.current) return;
    
    editorRef.current.setAttribute('dir', 'ltr');
    editorRef.current.style.direction = 'ltr';
    editorRef.current.style.textAlign = 'left';
    editorRef.current.style.unicodeBidi = 'plaintext';
    
    // Apply to all child elements
    const allElements = editorRef.current.querySelectorAll('*');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.setAttribute('dir', 'ltr');
        el.style.direction = 'ltr';
        el.style.textAlign = 'left';
        el.style.unicodeBidi = 'plaintext';
      }
    });
  }, []);

  // Synchronize editor content with state
  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    // Force LTR direction
    forceLTRForEditor();
    
    const content = e.currentTarget.innerHTML;
    setEditorContent(content);
    onChange(content);
  };
  
  // Synchronize when external value changes
  useEffect(() => {
    if (value !== editorContent) {
      setEditorContent(value);
    }
  }, [value]);
  
  // Add specific CSS rules to ensure LTR behavior
  useEffect(() => {
    const styleId = 'rich-text-editor-ltr-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      #rich-text-editor,
      #rich-text-editor * {
        direction: ltr !important;
        unicode-bidi: plaintext !important;
        text-align: left !important;
      }
    `;
    
    return () => {
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  
  // Initialize editor with correct direction
  useEffect(() => {
    const editorEl = document.getElementById('rich-text-editor');
    if (editorEl && onEditorInit) {
      forceLTRForEditor();
      onEditorInit(editorEl);
    }
  }, [onEditorInit, forceLTRForEditor]);
  
  // Set up mutation observer to ensure LTR is always maintained
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Initial setup
    forceLTRForEditor();
    
    const observer = new MutationObserver(() => {
      forceLTRForEditor();
    });
    
    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'dir']
    });
    
    return () => observer.disconnect();
  }, [forceLTRForEditor]);
  
  // When editor gains focus, force LTR
  const handleEditorFocus = () => {
    forceLTRForEditor();
  };
  
  // When any key is pressed, ensure LTR
  const handleKeyDown = () => {
    forceLTRForEditor();
  };
  
  // Hidden file input for image upload
  const triggerImageUpload = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };
  
  return (
    <div className="border rounded-md">
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload}
      />
      
      {/* Toolbar */}
      <div className="border-b p-2 bg-muted/50 flex flex-wrap gap-1 items-center">
        {/* Basic text styles */}
        <ToggleGroup type="multiple" className="flex flex-wrap gap-1">
          <ToggleGroupItem value="bold" aria-label="Negrito" onClick={() => execCommand('bold')}>
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Itálico" onClick={() => execCommand('italic')}>
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Sublinhado" onClick={() => execCommand('underline')}>
            <Underline className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Alignment */}
        <ToggleGroup type="single" className="flex flex-wrap gap-1">
          <ToggleGroupItem value="left" aria-label="Alinhar à esquerda" onClick={() => execCommand('justifyLeft')}>
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Centralizar" onClick={() => execCommand('justifyCenter')}>
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Alinhar à direita" onClick={() => execCommand('justifyRight')}>
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Lists */}
        <ToggleGroup type="single" className="flex flex-wrap gap-1">
          <ToggleGroupItem value="ordered" aria-label="Lista ordenada" onClick={() => execCommand('insertOrderedList')}>
            <ListOrdered className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="unordered" aria-label="Lista não ordenada" onClick={() => execCommand('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Font family */}
        <Select onValueChange={applyFontFamily}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fontes</SelectLabel>
              {fontFamilies.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        {/* Font size */}
        <Select onValueChange={applyFontSize}>
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue placeholder="Tamanho" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Tamanho</SelectLabel>
              {fontSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Cor do texto">
              <Paintbrush className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="grid grid-cols-10 gap-1">
              {textColors.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded-sm border border-gray-200 cursor-pointer"
                  style={{ backgroundColor: color }}
                  onClick={() => applyTextColor(color)}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Background color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Cor de fundo">
              <Paintbrush className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="grid grid-cols-10 gap-1">
              {bgColors.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded-sm border border-gray-200 cursor-pointer"
                  style={{ 
                    backgroundColor: color,
                    backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : undefined,
                    backgroundSize: color === 'transparent' ? '6px 6px' : undefined,
                    backgroundPosition: color === 'transparent' ? '0 0, 3px 3px' : undefined
                  }}
                  onClick={() => applyBgColor(color)}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Link */}
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Inserir link">
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL do Link</Label>
              <div className="flex gap-2">
                <Input 
                  id="link-url" 
                  value={linkUrl} 
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                />
                <Button onClick={insertLink}>Inserir</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image Insert Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Inserir imagem">
              <Image className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload de Imagem</Label>
                <Button onClick={triggerImageUpload} className="w-full justify-center">
                  Selecionar Imagem do Computador
                </Button>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPG, PNG, GIF, WEBP (máx: 5MB)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image-url">Ou Inserir URL da Imagem</Label>
                <div className="flex gap-2">
                  <Input 
                    id="image-url" 
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <Button onClick={insertImageFromUrl}>Inserir</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Editor with enhanced LTR settings */}
      <div
        id="rich-text-editor"
        ref={editorRef}
        className="p-4 min-h-[300px] outline-none prose prose-sm max-w-none"
        contentEditable="true"
        dangerouslySetInnerHTML={{ __html: editorContent }}
        onInput={handleEditorChange}
        onFocus={handleEditorFocus}
        onKeyDown={handleKeyDown}
        dir="ltr"
        style={{ 
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'plaintext',
        }}
      />
    </div>
  );
};

export default RichTextEditor;
