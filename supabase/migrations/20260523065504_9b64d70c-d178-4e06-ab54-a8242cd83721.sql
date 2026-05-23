ALTER TABLE public.profile_socials
ADD COLUMN IF NOT EXISTS show_social_links boolean NOT NULL DEFAULT true;