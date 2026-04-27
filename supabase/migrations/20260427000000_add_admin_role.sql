-- Migration to add 'rol' column to config_usuarios
ALTER TABLE public.config_usuarios 
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'user';

-- Set existing user (if any) as admin for convenience, or you can do this manually later.
-- For example, you might want to run:
-- UPDATE public.config_usuarios SET rol = 'admin' WHERE id_usuario_fk = 'tu_uuid';
