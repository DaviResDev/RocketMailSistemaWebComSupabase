
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EmailSendingData = {
  day: number;
  count: number;
};

export function useEmailSendingChart() {
  const [data, setData] = useState<EmailSendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const { user } = useAuth();

  const fetchAvailableYears = useCallback(async () => {
    if (!user) return;

    try {
      const { data: enviosData, error } = await supabase
        .from('envios')
        .select('data_envio')
        .eq('user_id', user.id)
        .order('data_envio', { ascending: false });

      if (error) throw error;

      const years = new Set<number>();
      enviosData?.forEach(envio => {
        const year = new Date(envio.data_envio).getFullYear();
        years.add(year);
      });

      const currentYear = new Date().getFullYear();
      years.add(currentYear);

      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    } catch (error) {
      console.error('Erro ao buscar anos disponíveis:', error);
      setAvailableYears([new Date().getFullYear()]);
    }
  }, [user]);

  const fetchEmailSendingData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      const { data: enviosData, error } = await supabase
        .from('envios')
        .select('data_envio')
        .eq('user_id', user.id)
        .gte('data_envio', startDate.toISOString())
        .lte('data_envio', endDate.toISOString());

      if (error) throw error;

      // Agrupar por dia
      const dailyCounts: { [key: number]: number } = {};
      const daysInMonth = endDate.getDate();

      // Inicializar todos os dias do mês com 0
      for (let day = 1; day <= daysInMonth; day++) {
        dailyCounts[day] = 0;
      }

      // Contar os envios por dia
      enviosData?.forEach(envio => {
        const day = new Date(envio.data_envio).getDate();
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });

      // Converter para array de objetos
      const chartData: EmailSendingData[] = Object.entries(dailyCounts).map(([day, count]) => ({
        day: parseInt(day),
        count: count
      }));

      setData(chartData);
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  useEffect(() => {
    fetchEmailSendingData();
  }, [fetchEmailSendingData]);

  return {
    data,
    loading,
    selectedMonth,
    selectedYear,
    availableYears,
    setSelectedMonth,
    setSelectedYear,
    refetch: fetchEmailSendingData
  };
}
