
-- Add template_file_url and template_file_name columns to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_file_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS template_file_name TEXT DEFAULT NULL;
