
-- Booking reviews table
CREATE TABLE public.booking_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referrer_video_id uuid,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  matched_video boolean,
  tags text[] NOT NULL DEFAULT '{}',
  comment text CHECK (comment IS NULL OR length(comment) <= 2000),
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','flagged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_reviews_deal ON public.booking_reviews (deal_id, created_at DESC);
CREATE INDEX idx_booking_reviews_business ON public.booking_reviews (business_id, created_at DESC);
CREATE INDEX idx_booking_reviews_creator ON public.booking_reviews (creator_id, created_at DESC) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_booking_reviews_user ON public.booking_reviews (user_id);
CREATE INDEX idx_booking_reviews_status ON public.booking_reviews (status);

-- Bookings completion + review prompt fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_prompt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_token text UNIQUE;

-- Profiles: business + creator aggregate ratings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS business_rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_rating_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS creator_rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_quality_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS creator_quality_refreshed_at timestamptz;

-- Deals: per-deal aggregate
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS deal_rating_count integer NOT NULL DEFAULT 0;

-- Trigger function: recompute aggregates on any change
CREATE OR REPLACE FUNCTION public.recompute_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal_id uuid;
  v_business_id uuid;
  v_creator_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_deal_id := OLD.deal_id;
    v_business_id := OLD.business_id;
    v_creator_id := OLD.creator_id;
  ELSE
    v_deal_id := NEW.deal_id;
    v_business_id := NEW.business_id;
    v_creator_id := NEW.creator_id;
  END IF;

  -- Deal aggregate
  UPDATE public.deals d
     SET deal_rating_avg = sub.avg_r,
         deal_rating_count = sub.cnt
    FROM (
      SELECT round(avg(rating)::numeric, 2) AS avg_r, count(*)::int AS cnt
        FROM public.booking_reviews
       WHERE deal_id = v_deal_id AND status = 'published'
    ) sub
   WHERE d.id = v_deal_id;

  -- Business aggregate (across all of the business's deals)
  UPDATE public.profiles p
     SET business_rating_avg = sub.avg_r,
         business_rating_count = sub.cnt,
         business_rating_refreshed_at = now()
    FROM (
      SELECT round(avg(rating)::numeric, 2) AS avg_r, count(*)::int AS cnt
        FROM public.booking_reviews
       WHERE business_id = v_business_id AND status = 'published'
    ) sub
   WHERE p.id = v_business_id;

  -- Creator aggregate
  IF v_creator_id IS NOT NULL THEN
    UPDATE public.profiles p
       SET creator_rating_avg = sub.avg_r,
           creator_rating_count = sub.cnt
      FROM (
        SELECT round(avg(rating)::numeric, 2) AS avg_r, count(*)::int AS cnt
          FROM public.booking_reviews
         WHERE creator_id = v_creator_id AND status = 'published'
      ) sub
     WHERE p.id = v_creator_id;
  END IF;

  -- Also handle the case where a row is UPDATEd and creator_id changed
  IF TG_OP = 'UPDATE' AND OLD.creator_id IS DISTINCT FROM NEW.creator_id AND OLD.creator_id IS NOT NULL THEN
    UPDATE public.profiles p
       SET creator_rating_avg = sub.avg_r,
           creator_rating_count = sub.cnt
      FROM (
        SELECT round(avg(rating)::numeric, 2) AS avg_r, count(*)::int AS cnt
          FROM public.booking_reviews
         WHERE creator_id = OLD.creator_id AND status = 'published'
      ) sub
     WHERE p.id = OLD.creator_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_booking_reviews_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_review_aggregates();

-- updated_at touch
CREATE TRIGGER trg_booking_reviews_touch
BEFORE UPDATE ON public.booking_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Refresh creator quality score (nightly)
CREATE OR REPLACE FUNCTION public.refresh_creator_quality()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH base AS (
    SELECT creator_id,
           count(*)::int AS n,
           avg(rating)::numeric AS avg_r,
           avg(case when matched_video then 1.0 else 0.0 end)::numeric AS match_rate
      FROM public.booking_reviews
     WHERE creator_id IS NOT NULL
       AND status = 'published'
       AND created_at >= now() - interval '12 months'
     GROUP BY creator_id
  ), scored AS (
    SELECT creator_id,
           CASE WHEN n < 3 THEN NULL
                ELSE round(
                  100 * (
                    0.60 * ((avg_r - 1) / 4.0)
                  + 0.25 * coalesce(match_rate, 0)
                  + 0.15 * least(1.0, ln(1 + n) / ln(50))
                  )::numeric, 2)
           END AS score
      FROM base
  )
  UPDATE public.profiles p
     SET creator_quality_score = s.score,
         creator_quality_refreshed_at = now()
    FROM scored s
   WHERE p.id = s.creator_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- RLS
ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews
CREATE POLICY "Published reviews are public"
  ON public.booking_reviews FOR SELECT
  USING (status = 'published');

-- Reviewer can see their own (any status)
CREATE POLICY "Reviewer can read own"
  ON public.booking_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "Admins can read all reviews"
  ON public.booking_reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Traveller can insert a review for their own confirmed/completed booking
CREATE POLICY "Reviewer can insert own"
  ON public.booking_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.id = booking_id
         AND b.user_id = auth.uid()
         AND b.status IN ('confirmed','paid','completed')
         AND b.completed_at IS NOT NULL
    )
  );

-- Editable for 72h
CREATE POLICY "Reviewer can edit own within 72h"
  ON public.booking_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND created_at > now() - interval '72 hours')
  WITH CHECK (auth.uid() = user_id);

-- Admins can update (moderation)
CREATE POLICY "Admins can update reviews"
  ON public.booking_reviews FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Backfill review_token for existing bookings
UPDATE public.bookings SET review_token = encode(gen_random_bytes(16), 'hex') WHERE review_token IS NULL;
