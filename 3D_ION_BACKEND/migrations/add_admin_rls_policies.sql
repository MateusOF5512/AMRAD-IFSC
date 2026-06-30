-- Admin full read/write on research data (pesquisadores remain owner-scoped via existing policies)
-- Defense in depth if authenticated role grants are ever restored on these tables.

CREATE POLICY materials_admin_all ON public.materials
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY machines_admin_all ON public.machines
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY samples_admin_all ON public.samples
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY infill_admin_all ON public.infill_measurements
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY mechanical_admin_all ON public.mechanical_properties
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY linear_attenuation_admin_all ON public.linear_attenuation
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY beam_qualities_admin_all ON public.beam_qualities
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY ct_scan_points_admin_all ON public.ct_scan_points
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY attenuation_tests_admin_all ON public.attenuation_tests
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY attenuation_measurements_admin_all ON public.attenuation_measurements
  FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());
