
import { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default function Configuracoes() {
  const { settings, loading, fetchSettings } = useSettings();

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <SettingsForm initialData={settings} />
        </div>
      )}
    </div>
  );
}
