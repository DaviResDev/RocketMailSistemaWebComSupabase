import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type Schedule = {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  created_at: string;
  contato?: {
    nome: string;
    email: string;
    telefone?: string;
    razao_social?: string;
    cliente?: string;
  };
  template?: {
    nome: string;
  };
};

export type ScheduleFormData = {
  contato_id: string;
  template_id: string;
  data_envio: string;
};

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSchedules = useCallback(async () => {
    try {
      if (!user) {
        setError("Você precisa estar logado para ver os agendamentos");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          contato:contatos (
            nome,
            email,
            telefone,
            razao_social,
            cliente
          ),
          template:templates (
            nome
          )
        `)
        .eq('user_id', user.id)
        .order('data_envio', { ascending: true });

      if (fetchError) {
        console.error("Error fetching schedules:", fetchError);
        throw fetchError;
      }
      
      console.log("Schedules fetched:", data);
      setSchedules(data || []);
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar agendamentos';
      console.error("Error in fetchSchedules:", errorMessage);
      setError(errorMessage);
      toast({
        title: "Erro",
        description: 'Erro ao carregar agendamentos: ' + errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createSchedule = async (formData: ScheduleFormData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: 'Você precisa estar logado para criar agendamentos',
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('agendamentos')
        .insert([{ ...formData, user_id: user.id }]);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: 'Agendamento criado com sucesso!'
      });
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: 'Erro ao criar agendamento: ' + error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const updateSchedule = async (id: string, formData: ScheduleFormData) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update(formData)
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: 'Agendamento atualizado com sucesso!'
      });
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: 'Erro ao atualizar agendamento: ' + error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: 'Agendamento excluído com sucesso!'
      });
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: 'Erro ao excluir agendamento: ' + error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
