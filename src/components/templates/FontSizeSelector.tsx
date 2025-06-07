
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FontSizeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const fontSizes = [
  { value: '10px', label: '10px - Muito Pequeno' },
  { value: '12px', label: '12px - Pequeno' },
  { value: '14px', label: '14px - Normal' },
  { value: '16px', label: '16px - Médio' },
  { value: '18px', label: '18px - Grande' },
  { value: '20px', label: '20px - Muito Grande' },
  { value: '22px', label: '22px - Extra Grande' },
  { value: '24px', label: '24px - Título Pequeno' },
  { value: '28px', label: '28px - Título Médio' },
  { value: '32px', label: '32px - Título Grande' },
  { value: '36px', label: '36px - Título Extra Grande' }
];

export function FontSizeSelector({ value, onChange }: FontSizeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="font_size">Tamanho da Fonte</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o tamanho" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              <span style={{ fontSize: size.value }}>
                {size.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground">
        Pré-visualização: <span style={{ fontSize: value }}>Texto de exemplo</span>
      </div>
    </div>
  );
}
