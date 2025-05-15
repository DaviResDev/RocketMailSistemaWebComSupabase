
import React, { useCallback, useState } from 'react';
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
  TextColor
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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
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

const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const [editorContent, setEditorContent] = useState(value || '');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  
  // Função para aplicar comandos básicos de formatação
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editorEl = document.getElementById('rich-text-editor');
    if (editorEl) {
      onChange(editorEl.innerHTML);
      setEditorContent(editorEl.innerHTML);
    }
  }, [onChange]);
  
  // Aplica família de fonte
  const applyFontFamily = (fontFamily: string) => {
    execCommand('fontName', fontFamily);
  };
  
  // Aplica tamanho de fonte
  const applyFontSize = (fontSize: string) => {
    const sizeMapping: { [key: string]: string } = {
      '10px': '1', '12px': '2', '14px': '3', '16px': '4',
      '18px': '5', '20px': '5', '24px': '6', '28px': '6',
      '32px': '7', '36px': '7', '48px': '7', '64px': '7'
    };
    execCommand('fontSize', sizeMapping[fontSize] || '3');
    
    // Aplica CSS para tamanho mais preciso
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
  
  // Aplica cor ao texto
  const applyTextColor = (color: string) => {
    execCommand('foreColor', color);
  };
  
  // Aplica cor de fundo
  const applyBgColor = (color: string) => {
    execCommand('hiliteColor', color);
  };
  
  // Insere um link
  const insertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkPopover(false);
    }
  };

  // Sincroniza o conteúdo do editor com o estado
  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    setEditorContent(content);
    onChange(content);
  };
  
  // Sincroniza o conteúdo do editor quando o valor externo muda
  React.useEffect(() => {
    if (value !== editorContent) {
      setEditorContent(value);
    }
  }, [value]);
  
  return (
    <div className="border rounded-md">
      {/* Barra de ferramentas */}
      <div className="border-b p-2 bg-muted/50 flex flex-wrap gap-1 items-center">
        {/* Estilos de texto básicos */}
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
        
        {/* Alinhamento */}
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
        
        {/* Listas */}
        <ToggleGroup type="single" className="flex flex-wrap gap-1">
          <ToggleGroupItem value="ordered" aria-label="Lista ordenada" onClick={() => execCommand('insertOrderedList')}>
            <ListOrdered className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="unordered" aria-label="Lista não ordenada" onClick={() => execCommand('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {/* Família de fonte */}
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
        
        {/* Tamanho da fonte */}
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
        
        {/* Cor do texto */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Cor do texto">
              <TextColor className="h-4 w-4" />
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
        
        {/* Cor de fundo */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-2" title="Cor de fundo">
              <TextColor className="h-4 w-4 opacity-50" />
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
                    backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : undefined,
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
      </div>
      
      {/* Editor */}
      <div
        id="rich-text-editor"
        className="p-4 min-h-[300px] outline-none prose prose-sm max-w-none"
        contentEditable="true"
        dangerouslySetInnerHTML={{ __html: editorContent }}
        onInput={handleEditorChange}
      />
    </div>
  );
};

export default RichTextEditor;
