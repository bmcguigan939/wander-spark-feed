
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS setup_business_type text CHECK (setup_business_type IN ('stay','activity')),
  ADD COLUMN IF NOT EXISTS activity_category text,
  ADD COLUMN IF NOT EXISTS activity_format text,
  ADD COLUMN IF NOT EXISTS activity_meeting_point text;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS price_unit text CHECK (price_unit IN ('per_night','per_person','per_group','flat'));
