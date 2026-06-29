-- Admin: truncate experimental tables (keeps researchers / auth data)
-- Run in Supabase SQL Editor, then call via: supabase.rpc('truncate_experimental_data')

CREATE OR REPLACE FUNCTION public.truncate_experimental_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    attenuation_measurements,
    attenuation_tests,
    ct_scan_points,
    infill_measurements,
    linear_attenuation,
    mechanical_properties,
    beam_qualities,
    sample_status_history,
    samples,
    materials,
    machines
  RESTART IDENTITY CASCADE;

  -- Legacy table (optional; ignore if missing)
  BEGIN
    EXECUTE 'TRUNCATE TABLE historico RESTART IDENTITY CASCADE';
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.truncate_experimental_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.truncate_experimental_data() TO service_role;
