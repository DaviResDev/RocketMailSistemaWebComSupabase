
import { useState, useEffect, useCallback } from 'react';
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

  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
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

      // Mapeia os status para termos consistentes
      const normalizeStatus = (status: string) => {
        if (status === 'enviado' || status === 'reenviado' || status === 'entregue') return 'entregue';
        if (status === 'pendente') return 'pendente';
        return 'falha'; // Inclui 'erro', 'com problemas', etc.
      };

      // Conta os status normalizados
      const statusCount = statusResult.data.reduce((acc: any, curr) => {
        const normalizedStatus = normalizeStatus(curr.status);
        acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
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
  }, [user]);
  
  // Subscribe to real-time updates for the envios table
  useEffect(() => {
    if (!user) return;
    
    fetchMetrics();
    
    // Set up real-time subscription for new envios
    const channel = supabase
      .channel('envios_updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'envios',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Received real-time update:', payload);
          fetchMetrics();
        }
      )
      .subscribe();
    
    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMetrics]);

  return {
    metrics,
    loading,
    fetchMetrics
  };
}
