-- Categories for deals + searchable business location
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.deal_category AS ENUM ('stay','eat','do','tour','transport','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS category public.deal_category NOT NULL DEFAULT 'other';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS place_name text;

-- Heuristic backfill of existing deals
UPDATE public.deals SET category = 'stay'
  WHERE category = 'other'
    AND (title ~* '\m(hotel|hostel|villa|resort|stay|inn|b&b|airbnb|apartment|lodge|guesthouse|riad)\M'
      OR description ~* '\m(hotel|hostel|villa|resort|stay|inn|b&b|airbnb|apartment|lodge|guesthouse|riad)\M');

UPDATE public.deals SET category = 'eat'
  WHERE category = 'other'
    AND (title ~* '\m(restaurant|cafe|coffee|bar|pub|eat|food|dinner|brunch|bistro|pizzeria|bakery)\M'
      OR description ~* '\m(restaurant|cafe|coffee|bar|pub|eat|food|dinner|brunch|bistro|pizzeria|bakery)\M');

UPDATE public.deals SET category = 'tour'
  WHERE category = 'other'
    AND (title ~* '\m(tour|guide|excursion|safari|cruise|day trip)\M'
      OR description ~* '\m(tour|guide|excursion|safari|cruise|day trip)\M');

UPDATE public.deals SET category = 'transport'
  WHERE category = 'other'
    AND (title ~* '\m(transfer|taxi|car rental|rental car|shuttle|flight|ferry|train|scooter)\M'
      OR description ~* '\m(transfer|taxi|car rental|rental car|shuttle|flight|ferry|train|scooter)\M');

UPDATE public.deals SET category = 'do'
  WHERE category = 'other'
    AND (title ~* '\m(activity|adventure|class|workshop|spa|massage|museum|ticket|experience|surf|dive|yoga|hike)\M'
      OR description ~* '\m(activity|adventure|class|workshop|spa|massage|museum|ticket|experience|surf|dive|yoga|hike)\M');

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS deals_title_trgm ON public.deals USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS deals_description_trgm ON public.deals USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS videos_title_trgm ON public.videos USING gin (title gin_trgm_ops);

-- Spatial-ish bbox indexes
CREATE INDEX IF NOT EXISTS deals_latlng_idx ON public.deals (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS videos_latlng_idx ON public.videos (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_latlng_idx ON public.profiles (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS deals_category_idx ON public.deals (category);