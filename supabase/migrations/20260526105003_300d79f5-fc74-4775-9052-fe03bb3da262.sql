-- Track user reports against reviews without auto-hiding.
-- Auto-hide once a review accumulates >= 3 distinct flags so abusive content is suppressed
-- without giving any single user the power to silence a review.

CREATE TABLE IF NOT EXISTS public.review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.booking_reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 2 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert their own flags"
  ON public.review_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users view their own flags"
  ON public.review_flags FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS review_flags_review_idx ON public.review_flags(review_id);

CREATE OR REPLACE FUNCTION public.auto_hide_review_on_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.review_flags WHERE review_id = NEW.review_id;
  IF v_count >= 3 THEN
    UPDATE public.booking_reviews SET status = 'flagged' WHERE id = NEW.review_id AND status = 'published';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS review_flags_autohide ON public.review_flags;
CREATE TRIGGER review_flags_autohide
AFTER INSERT ON public.review_flags
FOR EACH ROW EXECUTE FUNCTION public.auto_hide_review_on_flags();