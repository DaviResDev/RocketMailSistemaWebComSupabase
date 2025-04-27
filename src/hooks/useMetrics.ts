
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Metrics = {
  totalEnvios: number;
  enviolPorStatus: {
    status: string;
    count: number;
  }[];
  enviosPorCanal: {
    canal: string;
    count: number;
  }[];
};

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalEnvios: 0,
    enviolPorStatus: [],
    enviosPorCanal: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      const [enviosResult, statusResult, canalResult] = await Promise.all([
        supabase
          .from('envios')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('envios')
          .select('status')
          .eq('user_id', user.id),
        supabase
          .from('templates')
          .select('canal')
          .eq('user_id', user.id),
      ]);

      if (enviosResult.error) throw enviosResult.error;
      if (statusResult.error) throw statusResult.error;
      if (canalResult.error) throw canalResult.error;

      const statusCount = statusResult.data.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      const canalCount = canalResult.data.reduce((acc: any, curr) => {
        acc[curr.canal] = (acc[curr.canal] || 0) + 1;
        return acc;
      }, {});

      setMetrics({
        totalEnvios: enviosResult.count || 0,
        enviolPorStatus: Object.entries(statusCount).map(([status, count]) => ({
          status,
          count: count as number
        })),
        enviosPorCanal: Object.entries(canalCount).map(([canal, count]) => ({
          canal,
          count: count as number
        }))
      });
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    loading,
    fetchMetrics
  };
}
