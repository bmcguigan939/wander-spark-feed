
-- Raise founding cap to 5000 and add power-tier activity tracking.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS power_tier_last_qualified_at timestamptz;

-- For already-locked creators, seed the qualifier so the grace window doesn't fire immediately on first cron run.
UPDATE public.profiles
   SET power_tier_last_qualified_at = COALESCE(power_tier_last_qualified_at, power_tier_locked_at)
 WHERE power_tier_locked_at IS NOT NULL
   AND power_tier_last_qualified_at IS NULL;

-- Update the founding-number assignment trigger to use the new 5000 cap.
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
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND founding_creator_number IS NOT NULL) THEN
      RETURN NEW;
    END IF;
    SELECT COUNT(*) INTO cur_count FROM public.profiles WHERE founding_creator_number IS NOT NULL;
    IF cur_count < 5000 THEN
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

-- Rewrite the nightly tier-refresh: enforce activity bar + 60-day grace.
CREATE OR REPLACE FUNCTION public.refresh_creator_tiers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  newly_locked integer := 0;
BEGIN
  -- Refresh rolling 12-mo GBV for every creator.
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

  -- Activity check: stamp last_qualified_at for currently-locked creators who still meet both bars.
  UPDATE public.profiles p
     SET power_tier_last_qualified_at = now()
   WHERE p.power_tier_locked_at IS NOT NULL
     AND p.rolling_12mo_gbv_cents >= 2500000
     AND EXISTS (
       SELECT 1 FROM public.videos v
        WHERE v.creator_id = p.id
          AND v.status = 'ready'
          AND v.is_hidden = false
          AND v.is_draft = false
          AND v.created_at >= now() - interval '30 days'
     );

  -- Grace expiry: any locked creator whose last_qualified_at is older than 60 days loses Power Tier.
  UPDATE public.profiles
     SET power_tier_locked_at = NULL,
         power_tier_last_qualified_at = NULL
   WHERE power_tier_locked_at IS NOT NULL
     AND (
       power_tier_last_qualified_at IS NULL
       OR power_tier_last_qualified_at < now() - interval '60 days'
     );

  -- Lock newly-qualifying creators: meet both bars and not already locked.
  WITH locked AS (
    UPDATE public.profiles p
       SET power_tier_locked_at = now(),
           power_tier_last_qualified_at = now()
     WHERE p.power_tier_locked_at IS NULL
       AND p.rolling_12mo_gbv_cents >= 2500000
       AND EXISTS (
         SELECT 1 FROM public.videos v
          WHERE v.creator_id = p.id
            AND v.status = 'ready'
            AND v.is_hidden = false
            AND v.is_draft = false
            AND v.created_at >= now() - interval '30 days'
       )
     RETURNING p.id
  )
  SELECT COUNT(*) INTO newly_locked FROM locked;

  RETURN newly_locked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_creator_tiers() TO service_role;
