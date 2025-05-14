
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Template } from '@/types/template';

export function useTemplatesData() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Templates carregados:', data);
      
      // Transform the fetched data to ensure it has all required properties for Template type
      const formattedTemplates: Template[] = data?.map(template => ({
        ...template,
        status: template.status || 'ativo' // Always provide a default status since it's required now
      })) || [];
      
      setTemplates(formattedTemplates);
      return formattedTemplates;
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates: ' + (error.message || 'Falha na conexão com o servidor'));
      throw error; // Re-throw to allow caller to handle
    } finally {
      setLoading(false);
    }
  };

  // Carrega templates na montagem do componente se o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      fetchTemplates().catch(err => {
        console.error("Erro ao carregar templates no useEffect:", err);
      });
    }
  }, [user]);

  return { templates, loading, fetchTemplates };
}
