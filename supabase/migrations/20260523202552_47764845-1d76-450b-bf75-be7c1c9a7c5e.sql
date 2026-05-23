ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_source_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_source_check
  CHECK (source = ANY (ARRAY['manual'::text, 'ai_discovered'::text, 'affiliate_import'::text, 'invite'::text]));