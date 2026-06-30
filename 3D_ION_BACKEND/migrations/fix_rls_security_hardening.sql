-- AMRAD: comprehensive RLS security hardening
-- Run in Supabase SQL editor or via supabase db push
-- Defense in depth: correct RLS policies + revoke direct API access for anon/authenticated

-- =============================================================================
-- 1. Helper functions (SECURITY INVOKER, fixed search_path)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_researcher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id FROM public.researchers WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.researchers
    WHERE auth_id = auth.uid() AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_sample(p_sample_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.samples
    WHERE id = p_sample_id AND researcher_id = public.current_researcher_id()
  );
$$;

-- =============================================================================
-- 2. Remove dangerous legacy function (dropped entire infill_measurements table)
-- =============================================================================

DROP FUNCTION IF EXISTS public.drop_old_infill_measurements();

-- =============================================================================
-- 3. Drop all existing RLS policies (public schema)
-- =============================================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;

-- =============================================================================
-- 4. Missing tables + RLS enable
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attenuation_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  rqr_energy TEXT NOT NULL,
  i0 DOUBLE PRECISION NOT NULL CHECK (i0 > 0),
  mu_coefficient DOUBLE PRECISION,
  regression_slope DOUBLE PRECISION,
  regression_intercept DOUBLE PRECISION,
  r_squared DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attenuation_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.attenuation_tests(id) ON DELETE CASCADE,
  thickness DOUBLE PRECISION NOT NULL CHECK (thickness >= 0),
  transmission DOUBLE PRECISION NOT NULL CHECK (transmission > 0),
  ln_relative DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attenuation_tests_sample_id ON public.attenuation_tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_attenuation_measurements_test_id ON public.attenuation_measurements(test_id);

CREATE TABLE IF NOT EXISTS public.pattern_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pattern_types_pkey PRIMARY KEY (id)
);

INSERT INTO public.pattern_types (name, description) VALUES
  ('Rectilinear', 'Padrão retilíneo'),
  ('Grid', 'Padrão em grade'),
  ('Line', 'Padrão em linhas'),
  ('Cubic', 'Padrão cúbico'),
  ('Triangles', 'Padrão triangular'),
  ('Gyroid', 'Padrão Gyroid'),
  ('Honeycomb', 'Padrão em favo de mel'),
  ('Cross', 'Padrão em cruz'),
  ('3D Honeycomb', 'Favo de mel 3D'),
  ('Hilbert Curve', 'Curva de Hilbert'),
  ('Octagram Spiral', 'Espiral Octagram'),
  ('CrossHatch', 'Padrão cruzado'),
  ('Archimedean Chords', 'Cordas de Arquimedes')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS pattern_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS pattern_type_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'samples_pattern_type_id_fkey'
  ) THEN
    ALTER TABLE public.samples
      ADD CONSTRAINT samples_pattern_type_id_fkey
      FOREIGN KEY (pattern_type_id) REFERENCES public.pattern_types(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_status_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES public.researchers(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_status_logs_user_id ON public.user_status_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_logs_admin_id ON public.user_status_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_status_logs_changed_at ON public.user_status_logs(changed_at DESC);

ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infill_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanical_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linear_attenuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beam_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_scan_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attenuation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attenuation_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. Trigger: block privilege escalation on researchers (non-admin, non-service)
-- =============================================================================

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
  IF auth.jwt() IS NULL THEN
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

DROP TRIGGER IF EXISTS researchers_protect_privileged_columns ON public.researchers;
CREATE TRIGGER researchers_protect_privileged_columns
  BEFORE UPDATE ON public.researchers
  FOR EACH ROW
  EXECUTE FUNCTION public.researchers_protect_privileged_columns();

-- =============================================================================
-- 6. RLS policies (auth_id-based, not researchers.id = auth.uid())
-- =============================================================================

-- researchers
CREATE POLICY researchers_select_own ON public.researchers
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY researchers_select_admin ON public.researchers
  FOR SELECT USING (public.is_app_admin());

CREATE POLICY researchers_insert_own ON public.researchers
  FOR INSERT WITH CHECK (
    auth_id = auth.uid()
    AND user_type = 'pesquisador'
    AND COALESCE(status, 'regular') NOT IN ('blocked', 'deleted')
  );

CREATE POLICY researchers_update_own ON public.researchers
  FOR UPDATE
  USING (auth_id = auth.uid() AND NOT public.is_app_admin())
  WITH CHECK (auth_id = auth.uid() AND user_type = 'pesquisador');

CREATE POLICY researchers_update_admin ON public.researchers
  FOR UPDATE
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- materials / machines / samples (owner-scoped)
CREATE POLICY materials_select_own ON public.materials
  FOR SELECT USING (researcher_id = public.current_researcher_id());

CREATE POLICY materials_insert_own ON public.materials
  FOR INSERT WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY materials_update_own ON public.materials
  FOR UPDATE
  USING (researcher_id = public.current_researcher_id())
  WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY materials_delete_own ON public.materials
  FOR DELETE USING (researcher_id = public.current_researcher_id());

CREATE POLICY machines_select_own ON public.machines
  FOR SELECT USING (researcher_id = public.current_researcher_id());

CREATE POLICY machines_insert_own ON public.machines
  FOR INSERT WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY machines_update_own ON public.machines
  FOR UPDATE
  USING (researcher_id = public.current_researcher_id())
  WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY machines_delete_own ON public.machines
  FOR DELETE USING (researcher_id = public.current_researcher_id());

CREATE POLICY samples_select_own ON public.samples
  FOR SELECT USING (researcher_id = public.current_researcher_id());

CREATE POLICY samples_insert_own ON public.samples
  FOR INSERT WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY samples_update_own ON public.samples
  FOR UPDATE
  USING (researcher_id = public.current_researcher_id())
  WITH CHECK (researcher_id = public.current_researcher_id());

CREATE POLICY samples_delete_own ON public.samples
  FOR DELETE USING (researcher_id = public.current_researcher_id());

-- sample child tables
CREATE POLICY infill_manage_own ON public.infill_measurements
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY mechanical_manage_own ON public.mechanical_properties
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY linear_attenuation_manage_own ON public.linear_attenuation
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY beam_qualities_manage_own ON public.beam_qualities
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY ct_scan_points_manage_own ON public.ct_scan_points
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY attenuation_tests_manage_own ON public.attenuation_tests
  FOR ALL USING (public.owns_sample(sample_id));

CREATE POLICY attenuation_measurements_manage_own ON public.attenuation_measurements
  FOR ALL USING (
    test_id IN (
      SELECT t.id FROM public.attenuation_tests t
      WHERE public.owns_sample(t.sample_id)
    )
  );

-- sample_status_history
CREATE POLICY sample_status_history_select ON public.sample_status_history
  FOR SELECT USING (
    public.is_app_admin() OR public.owns_sample(sample_id)
  );

CREATE POLICY sample_status_history_insert ON public.sample_status_history
  FOR INSERT WITH CHECK (
    public.is_app_admin() OR public.owns_sample(sample_id)
  );

-- application_logs (read-only for users; insert via service_role only)
CREATE POLICY application_logs_admin_select ON public.application_logs
  FOR SELECT USING (public.is_app_admin());

CREATE POLICY application_logs_user_select ON public.application_logs
  FOR SELECT USING (user_id = public.current_researcher_id());

CREATE POLICY application_logs_no_update ON public.application_logs
  FOR UPDATE USING (false);

CREATE POLICY application_logs_no_delete ON public.application_logs
  FOR DELETE USING (false);

-- pattern_types: reference data, read-only for authenticated (if grants restored)
CREATE POLICY pattern_types_read ON public.pattern_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- user_status_logs: admin read only; writes via service_role
CREATE POLICY user_status_logs_admin_select ON public.user_status_logs
  FOR SELECT USING (public.is_app_admin());

-- historico: legacy table, explicit deny-all
CREATE POLICY historico_deny_all ON public.historico
  FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 7. Admin maintenance RPC (service_role only)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.truncate_experimental_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    public.attenuation_measurements,
    public.attenuation_tests,
    public.ct_scan_points,
    public.infill_measurements,
    public.linear_attenuation,
    public.mechanical_properties,
    public.beam_qualities,
    public.sample_status_history,
    public.samples,
    public.materials,
    public.machines
  RESTART IDENTITY CASCADE;

  BEGIN
    EXECUTE 'TRUNCATE TABLE public.historico RESTART IDENTITY CASCADE';
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.truncate_experimental_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.truncate_experimental_data() TO service_role;

-- =============================================================================
-- 8. Revoke direct PostgREST/GraphQL access for anon + authenticated
--    All application data flows through FastAPI + service_role
-- =============================================================================

DO $$
DECLARE
  tbl record;
  seq record;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl.tablename);
  END LOOP;

  FOR seq IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', seq.seq_name);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.current_researcher_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_app_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_sample(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_researcher_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.owns_sample(uuid) TO service_role;
