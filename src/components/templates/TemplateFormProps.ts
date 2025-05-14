
import { FormEvent } from "react";
import { TemplateFormData, Template } from "@/types/template";

export interface TemplateFormProps {
  template?: Template;
  isEditing?: boolean;
  onSave: (formData: any) => Promise<boolean>;
  onCancel?: () => void;
  onSendTest?: (templateId: string) => Promise<boolean>;
}
