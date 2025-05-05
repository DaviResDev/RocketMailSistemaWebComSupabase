
-- Add two_factor_enabled column to configuracoes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'configuracoes' 
    AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE public.configuracoes ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;
