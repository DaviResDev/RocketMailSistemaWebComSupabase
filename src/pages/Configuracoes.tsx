
import React, { useEffect } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { useSettings } from '@/hooks/useSettings';
import { WhatsAppQrCode } from '@/components/settings/WhatsAppQrCode';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Configuracoes() {
  const { fetchSettings, loading } = useSettings();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

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
