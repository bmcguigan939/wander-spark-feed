-- Drop the over-strict self-update policy that silently blocked profile saves
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;

-- Recreate as a simple self-update policy
CREATE POLICY "profiles self update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Move the "users can't self-promote verification" guard into a BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.protect_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins: keep verification fields immutable
  NEW.is_verified  := OLD.is_verified;
  NEW.verified_at  := OLD.verified_at;
  NEW.verified_by  := OLD.verified_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_verification ON public.profiles;
CREATE TRIGGER profiles_protect_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_verification();