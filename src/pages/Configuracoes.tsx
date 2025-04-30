
import React, { useEffect } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { useSettings } from '@/hooks/useSettings';
import { WhatsAppQrCode } from '@/components/settings/WhatsAppQrCode';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { fetchSettings } = useSettings();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      <SettingsForm
        onSave={() => {
          toast.success('Configurações atualizadas com sucesso!');
        }}
      />
      
      <div className="mt-6">
        <WhatsAppQrCode 
          onConnect={() => {
            toast.success('WhatsApp conectado com sucesso!');
          }}
        />
      </div>
    </div>
  );
}
