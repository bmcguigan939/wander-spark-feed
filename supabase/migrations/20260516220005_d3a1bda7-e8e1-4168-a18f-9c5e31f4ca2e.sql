-- Add quality scoring fields to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS quality_score numeric,
  ADD COLUMN IF NOT EXISTS quality_reasons jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_deals_quality_score ON public.deals(quality_score DESC NULLS LAST);

-- Moderation flags table
CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('video','comment')),
  target_id uuid NOT NULL,
  label text NOT NULL, -- spam | fake_review | off_platform | hate | nsfw | other
  confidence numeric NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','auto_hidden','resolved','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON public.moderation_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_target ON public.moderation_flags(target_type, target_id);

ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all flags"
  ON public.moderation_flags FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update flags"
  ON public.moderation_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "creators read flags on own videos"
  ON public.moderation_flags FOR SELECT
  USING (
    target_type = 'video' AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = moderation_flags.target_id AND v.creator_id = auth.uid()
    )
  );