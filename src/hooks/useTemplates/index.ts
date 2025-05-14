
// Arquivo principal que exporta todas as funções de hooks relacionadas a templates
import { useTemplatesData } from './useTemplatesData';
import { useTemplateOperations } from './useTemplateOperations';
import { useTemplateEmail } from './useTemplateEmail';

export function useTemplates() {
  const { templates, loading, fetchTemplates } = useTemplatesData();
  const { createTemplate, updateTemplate, duplicateTemplate, deleteTemplate } = useTemplateOperations();
  const { sendTestEmail } = useTemplateEmail();

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    sendTestEmail
  };
}
