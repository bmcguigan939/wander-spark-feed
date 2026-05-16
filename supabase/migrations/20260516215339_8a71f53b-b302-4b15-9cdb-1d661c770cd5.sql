CREATE TABLE public.video_business_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  city text,
  country text,
  website_guess text,
  confidence numeric,
  source text,
  status text NOT NULL DEFAULT 'pending',
  converted_invite_id uuid,
  detected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, name)
);

CREATE INDEX idx_vbs_video_status ON public.video_business_suggestions(video_id, status);

ALTER TABLE public.video_business_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator reads own video suggestions"
  ON public.video_business_suggestions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_business_suggestions.video_id AND v.creator_id = auth.uid()));

CREATE POLICY "creator updates own video suggestions"
  ON public.video_business_suggestions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_business_suggestions.video_id AND v.creator_id = auth.uid()));

CREATE POLICY "creator deletes own video suggestions"
  ON public.video_business_suggestions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_business_suggestions.video_id AND v.creator_id = auth.uid()));

CREATE POLICY "admins read all suggestions"
  ON public.video_business_suggestions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));