
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type Template = {
  id: string;
  nome: string;
  conteudo: string;
  canal: string;
  assinatura?: string;
  created_at: string;
};

export type TemplateFormData = {
  nome: string;
  conteudo: string;
  canal: string;
  assinatura?: string;
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (formData: TemplateFormData) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar templates');
      return false;
    }

    try {
      const { error } = await supabase
        .from('templates')
        .insert([{ ...formData, user_id: user.id }]);

      if (error) throw error;
      toast.success('Template criado com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      toast.error('Erro ao criar template: ' + error.message);
      return false;
    }
  };

  const updateTemplate = async (id: string, formData: TemplateFormData) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update(formData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Template atualizado com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      toast.error('Erro ao atualizar template: ' + error.message);
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template excluído com sucesso!');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      toast.error('Erro ao excluir template: ' + error.message);
      return false;
    }
  };

  const sendTestEmail = async (templateId: string, email: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar emails de teste');
      return false;
    }

    try {
      // Get the template first
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      
      // Call our send-email edge function
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `[TESTE] ${template.nome}`,
          content: template.conteudo,
          isTest: true,
          template_id: templateId
        },
      });
      
      if (response.error) throw new Error(response.error.message);
      
      toast.success(`Email de teste enviado para ${email}!`);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar email de teste:', error);
      toast.error('Erro ao enviar email de teste: ' + (error.message || 'Falha na conexão com o servidor'));
      return false;
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    sendTestEmail
  };
}
