
-- v6 Tapered + Power-Creator Tier commission model

-- 1. Profiles: tier state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founding_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_creator_number integer,
  ADD COLUMN IF NOT EXISTS creator_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS power_tier_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS rolling_12mo_gbv_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rolling_12mo_gbv_refreshed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_founding_creator_number_key
  ON public.profiles(founding_creator_number) WHERE founding_creator_number IS NOT NULL;

-- Backfill: existing creators get joined-at from created_at
UPDATE public.profiles SET creator_joined_at = created_at WHERE creator_joined_at IS NULL;

-- Assign founding numbers to the first 500 creators (by created_at) that are actually creators
WITH ranked AS (
  SELECT p.id, row_number() OVER (ORDER BY p.created_at ASC, p.id ASC) AS rn
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'creator'
  WHERE p.founding_creator_number IS NULL
)
UPDATE public.profiles p
   SET founding_creator_number = r.rn,
       is_founding_creator = true
  FROM ranked r
 WHERE p.id = r.id AND r.rn <= 500;

-- 2. Founding cap trigger: assign founding_creator_number when a profile becomes a creator (insert path via handle_new_user assigns 'traveller', so we use a role-grant hook)
-- Function: assign founding number if cap not reached
CREATE OR REPLACE FUNCTION public.assign_founding_creator_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_count integer;
BEGIN
  IF NEW.role = 'creator' THEN
    -- Skip if profile already has a number
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND founding_creator_number IS NOT NULL) THEN
      RETURN NEW;
    END IF;
    SELECT COUNT(*) INTO cur_count FROM public.profiles WHERE founding_creator_number IS NOT NULL;
    IF cur_count < 500 THEN
      UPDATE public.profiles
         SET founding_creator_number = cur_count + 1,
             is_founding_creator = true,
             creator_joined_at = COALESCE(creator_joined_at, now())
       WHERE id = NEW.user_id;
    ELSE
      UPDATE public.profiles
         SET creator_joined_at = COALESCE(creator_joined_at, now())
       WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_founding_creator_number ON public.user_roles;
CREATE TRIGGER trg_assign_founding_creator_number
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.assign_founding_creator_number();

-- 3. deal_redemptions: per-row split snapshot
ALTER TABLE public.deal_redemptions
  ADD COLUMN IF NOT EXISTS creator_share_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS platform_share_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS creator_commission_cents integer,
  ADD COLUMN IF NOT EXISTS platform_commission_cents integer,
  ADD COLUMN IF NOT EXISTS creator_tier text;

-- Backfill: existing rows are 50/50, tier 'new'
UPDATE public.deal_redemptions
   SET creator_share_pct = 50.00,
       platform_share_pct = 50.00,
       creator_tier = 'new',
       creator_commission_cents = COALESCE(creator_commission_cents, FLOOR(COALESCE(commission_cents,0) * 0.5)::int),
       platform_commission_cents = COALESCE(platform_commission_cents, COALESCE(commission_cents,0) - FLOOR(COALESCE(commission_cents,0) * 0.5)::int)
 WHERE creator_share_pct IS NULL;

-- 4. Function to refresh rolling-12mo GBV + flip power tier lock (called by cron)
CREATE OR REPLACE FUNCTION public.refresh_creator_tiers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  newly_locked integer := 0;
BEGIN
  -- Aggregate confirmed GBV in last 12 months per creator
  WITH agg AS (
    SELECT dr.creator_id AS cid,
           COALESCE(SUM(dr.order_value_cents), 0)::bigint AS gbv_cents
      FROM public.deal_redemptions dr
     WHERE dr.creator_id IS NOT NULL
       AND dr.status = 'confirmed'
       AND dr.confirmed_at >= now() - interval '12 months'
     GROUP BY dr.creator_id
  )
  UPDATE public.profiles p
     SET rolling_12mo_gbv_cents = COALESCE(a.gbv_cents, 0),
         rolling_12mo_gbv_refreshed_at = now()
    FROM (
      SELECT p2.id AS cid, COALESCE(a.gbv_cents, 0) AS gbv_cents
        FROM public.profiles p2
        LEFT JOIN agg a ON a.cid = p2.id
        JOIN public.user_roles ur ON ur.user_id = p2.id AND ur.role = 'creator'
    ) a
   WHERE p.id = a.cid;

  -- Lock power tier for any creator newly above £25k (2,500,000 pence) and not already locked
  WITH locked AS (
    UPDATE public.profiles
       SET power_tier_locked_at = now()
     WHERE power_tier_locked_at IS NULL
       AND rolling_12mo_gbv_cents >= 2500000
     RETURNING id
  )
  SELECT COUNT(*) INTO newly_locked FROM locked;

  RETURN newly_locked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_creator_tiers() TO service_role;
