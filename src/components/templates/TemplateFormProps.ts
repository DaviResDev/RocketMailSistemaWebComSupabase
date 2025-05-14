
import { FormEvent } from "react";
import { TemplateFormData } from "@/types/template";

export interface TemplateFormProps {
  onSubmit: (e: FormEvent) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
  formData?: TemplateFormData;
  setFormData?: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}
