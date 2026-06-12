
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS setup_property_kind text,
  ADD COLUMN IF NOT EXISTS setup_unit_count integer,
  ADD COLUMN IF NOT EXISTS setup_units_same_address boolean,
  ADD COLUMN IF NOT EXISTS setup_step_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ota_listings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS channel_manager_planned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS breakfast_offered text,
  ADD COLUMN IF NOT EXISTS parking_offered text,
  ADD COLUMN IF NOT EXISTS languages_spoken text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS neighbourhood_blurb text,
  ADD COLUMN IF NOT EXISTS default_booking_model text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS pay_at_property_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_stays_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_entity_type text,
  ADD COLUMN IF NOT EXISTS legal_entity_name text,
  ADD COLUMN IF NOT EXISTS legal_contact_email text,
  ADD COLUMN IF NOT EXISTS legal_contact_phone text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_setup_property_kind_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_setup_property_kind_check
      CHECK (setup_property_kind IS NULL OR setup_property_kind IN ('apartment','home','hotel','alternative'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_default_booking_model_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_default_booking_model_check
      CHECK (default_booking_model IN ('instant','request'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_breakfast_offered_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_breakfast_offered_check
      CHECK (breakfast_offered IS NULL OR breakfast_offered IN ('no','yes_free','yes_paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_parking_offered_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_parking_offered_check
      CHECK (parking_offered IS NULL OR parking_offered IN ('no','yes_free','yes_paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_legal_entity_type_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_legal_entity_type_check
      CHECK (legal_entity_type IS NULL OR legal_entity_type IN ('individual','business'));
  END IF;
END $$;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS booking_model text NOT NULL DEFAULT 'instant';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_booking_model_check') THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_booking_model_check
      CHECK (booking_model IN ('instant','request'));
  END IF;
END $$;
