
-- Add two_factor_enabled field to configuracoes table
ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
