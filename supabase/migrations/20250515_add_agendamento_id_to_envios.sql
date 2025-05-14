
-- Verificar se a coluna agendamento_id já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'envios' 
        AND column_name = 'agendamento_id'
    ) THEN
        -- Adicionar coluna agendamento_id
        ALTER TABLE public.envios 
        ADD COLUMN agendamento_id UUID REFERENCES public.agendamentos(id) NULL;
    END IF;
END $$;
