-- Fix: backend uses Supabase service_role key, which sends a JWT (not NULL).
-- The privilege trigger must allow service_role updates to user_type/status.

CREATE OR REPLACE FUNCTION public.researchers_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Backend service_role / direct DB connections
  IF auth.jwt() IS NULL
     OR COALESCE(auth.jwt()->>'role', '') = 'service_role'
     OR COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    RAISE EXCEPTION 'Cannot change user_type';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change status';
  END IF;

  RETURN NEW;
END;
$$;
