
ALTER TABLE public.profile_socials
  ADD COLUMN IF NOT EXISTS facebook_handle text;

-- Backfill: any user with a ready video OR any business with a confirmed redemption gets trusted
UPDATE public.profiles p
SET is_verified = true,
    verified_at = COALESCE(p.verified_at, now())
WHERE p.is_verified = false
  AND (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.creator_id = p.id AND v.status = 'ready'
    )
    OR EXISTS (
      SELECT 1 FROM public.deal_redemptions dr
      JOIN public.deals d ON d.id = dr.deal_id
      WHERE d.business_id = p.id AND dr.status = 'confirmed'
    )
  );
