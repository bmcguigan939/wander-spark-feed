-- Drop the duplicate trigger on auth.users that was causing
-- "duplicate key value violates unique constraint profiles_pkey"
-- on every signup. Keep the original on_auth_user_created trigger.
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;

-- Harden handle_new_user so any future accidental duplicate trigger
-- or retry can't break signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  -- If a profile already exists for this user, do nothing.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  base_username := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1),
             'user' || substr(NEW.id::text, 1, 8)),
    '[^a-z0-9_]', '', 'g'));
  IF length(base_username) < 3 THEN base_username := 'user' || substr(NEW.id::text, 1, 8); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_username,
          COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_username),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'traveller')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;