
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type Schedule = {
  id: string;
  contato_id: string;
  template_id: string;
  data_envio: string;
  status: string;
  created_at: string;
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

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .order('data_envio', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar agendamentos';
      setError(errorMessage);
      toast.error('Erro ao carregar agendamentos: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (formData: ScheduleFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar agendamentos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('agendamentos')
        .insert([{ ...formData, user_id: user.id }]);

      if (error) throw error;
      toast.success('Agendamento criado com sucesso!');
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast.error('Erro ao criar agendamento: ' + error.message);
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
      toast.success('Agendamento atualizado com sucesso!');
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast.error('Erro ao atualizar agendamento: ' + error.message);
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
      toast.success('Agendamento excluído com sucesso!');
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast.error('Erro ao excluir agendamento: ' + error.message);
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
