-- Attenuation module: RQR tests with Beer-Lambert regression (μ)
-- Run in Supabase SQL editor before using the new attenuation flow.

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

ALTER TABLE public.attenuation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attenuation_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attenuation tests for their samples"
  ON public.attenuation_tests
  FOR ALL
  USING (
    sample_id IN (
      SELECT s.id FROM public.samples s
      WHERE s.researcher_id = (
        SELECT r.id FROM public.researchers r WHERE r.auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage attenuation measurements for their tests"
  ON public.attenuation_measurements
  FOR ALL
  USING (
    test_id IN (
      SELECT t.id FROM public.attenuation_tests t
      JOIN public.samples s ON t.sample_id = s.id
      WHERE s.researcher_id = (
        SELECT r.id FROM public.researchers r WHERE r.auth_id = auth.uid()
      )
    )
  );
