
-- Add description field to templates table
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Ensure the signature_image column exists (in case it was missing)
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS signature_image TEXT;
