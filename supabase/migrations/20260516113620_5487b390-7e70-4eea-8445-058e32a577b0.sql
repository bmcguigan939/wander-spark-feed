
CREATE TABLE public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  destination text NOT NULL,
  country text,
  city text,
  days integer NOT NULL CHECK (days >= 1 AND days <= 14),
  interests text[] NOT NULL DEFAULT '{}',
  budget_tag text,
  summary text,
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itineraries owner read" ON public.itineraries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "itineraries owner insert" ON public.itineraries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "itineraries owner update" ON public.itineraries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "itineraries owner delete" ON public.itineraries
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER touch_itineraries_updated
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_itineraries_user_created ON public.itineraries(user_id, created_at DESC);
