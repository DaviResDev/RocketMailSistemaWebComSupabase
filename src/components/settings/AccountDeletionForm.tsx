
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function AccountDeletionForm() {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'EXCLUIR CONTA') {
      toast.error('Digite "EXCLUIR CONTA" para confirmar');
      return;
    }

    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete user data from our tables first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Delete templates
      const { error: templatesError } = await supabase
        .from('templates')
        .delete()
        .eq('user_id', user.id);

      if (templatesError) {
        console.error('Error deleting templates:', templatesError);
      }

      // Delete contacts
      const { error: contactsError } = await supabase
        .from('contatos')
        .delete()
        .eq('user_id', user.id);

      if (contactsError) {
        console.error('Error deleting contacts:', contactsError);
      }

      // Delete settings
      const { error: settingsError } = await supabase
        .from('configuracoes')
        .delete()
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error deleting settings:', settingsError);
      }

      // Delete user settings
      const { error: userSettingsError } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', user.id);

      if (userSettingsError) {
        console.error('Error deleting user settings:', userSettingsError);
      }

      // Delete envios
      const { error: enviosError } = await supabase
        .from('envios')
        .delete()
        .eq('user_id', user.id);

      if (enviosError) {
        console.error('Error deleting envios:', enviosError);
      }

      // Delete agendamentos
      const { error: agendamentosError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('user_id', user.id);

      if (agendamentosError) {
        console.error('Error deleting agendamentos:', agendamentosError);
      }

      toast.success('Conta excluída com sucesso');
      
      // Sign out and redirect to home
      await signOut();
      navigate('/');
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta: ' + error.message);
    } finally {
      setIsDeleting(false);
      setConfirmationText('');
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center">
          <Trash2 className="w-5 h-5 mr-2" />
          Cancelar Assinatura
        </CardTitle>
        <CardDescription>
          Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Cancelar Assinatura
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza que deseja excluir sua conta permanentemente?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>Esta ação é irreversível e resultará na exclusão permanente de:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos os seus templates</li>
                  <li>Todos os seus contatos</li>
                  <li>Todas as suas configurações</li>
                  <li>Todo o histórico de envios</li>
                  <li>Sua conta de usuário</li>
                </ul>
                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Para confirmar, digite "EXCLUIR CONTA":
                  </Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="EXCLUIR CONTA"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmationText('')}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={confirmationText !== 'EXCLUIR CONTA' || isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Conta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
