ALTER TABLE public.profiles ALTER COLUMN anonymous_alias SET DEFAULT 'Anonymous';
UPDATE public.profiles SET anonymous_alias = 'Anonymous' WHERE anonymous_alias IS NULL;
ALTER TABLE public.profiles ALTER COLUMN anonymous_alias SET NOT NULL;