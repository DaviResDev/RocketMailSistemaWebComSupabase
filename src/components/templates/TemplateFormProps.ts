
import { Template, TemplateFormData } from '@/types/template';

export interface TemplateFormProps {
  template?: Template;
  isEditing: boolean;
  onSave: (formData: TemplateFormData) => Promise<boolean>;
  onCancel: () => void;
  onSendTest?: (templateId: string) => Promise<boolean>;
}
