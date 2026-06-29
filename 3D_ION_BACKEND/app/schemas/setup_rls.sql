-- ION3D Platform: Row Level Security (RLS) Setup
-- Execute this in Supabase SQL Editor to configure RLS policies

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infill_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanical_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linear_attenuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beam_qualities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Researchers Table Policies
-- ============================================

-- Allow users to create their own researcher record
CREATE POLICY "Users can insert their own researcher record"
  ON public.researchers
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Allow users to view their own researcher record
CREATE POLICY "Users can view their own researcher record"
  ON public.researchers
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Allow users to update their own researcher record
CREATE POLICY "Users can update their own researcher record"
  ON public.researchers
  FOR UPDATE USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ============================================
-- Materials Table Policies
-- ============================================

-- Allow users to insert their own materials
CREATE POLICY "Users can insert their own materials"
  ON public.materials
  FOR INSERT WITH CHECK (auth.uid()::text = researcher_id::text);

-- Allow users to view their own materials
CREATE POLICY "Users can view their own materials"
  ON public.materials
  FOR SELECT
  USING (auth.uid()::text = researcher_id::text);

-- Allow users to update their own materials
CREATE POLICY "Users can update their own materials"
  ON public.materials
  FOR UPDATE USING (auth.uid()::text = researcher_id::text)
  WITH CHECK (auth.uid()::text = researcher_id::text);

-- Allow users to delete their own materials
CREATE POLICY "Users can delete their own materials"
  ON public.materials
  FOR DELETE USING (auth.uid()::text = researcher_id::text);

-- ============================================
-- Machines Table Policies
-- ============================================

CREATE POLICY "Users can insert their own machines"
  ON public.machines
  FOR INSERT WITH CHECK (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can view their own machines"
  ON public.machines
  FOR SELECT
  USING (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can update their own machines"
  ON public.machines
  FOR UPDATE USING (auth.uid()::text = researcher_id::text)
  WITH CHECK (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can delete their own machines"
  ON public.machines
  FOR DELETE USING (auth.uid()::text = researcher_id::text);

-- ============================================
-- Samples Table Policies
-- ============================================

CREATE POLICY "Users can insert their own samples"
  ON public.samples
  FOR INSERT WITH CHECK (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can view their own samples"
  ON public.samples
  FOR SELECT
  USING (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can update their own samples"
  ON public.samples
  FOR UPDATE USING (auth.uid()::text = researcher_id::text)
  WITH CHECK (auth.uid()::text = researcher_id::text);

CREATE POLICY "Users can delete their own samples"
  ON public.samples
  FOR DELETE USING (auth.uid()::text = researcher_id::text);

-- ============================================
-- Measurements Table Policies
-- ============================================

-- Infill Measurements
CREATE POLICY "Users can manage their sample infill measurements"
  ON public.infill_measurements
  FOR ALL
  USING (
    sample_id IN (
      SELECT id FROM public.samples 
      WHERE auth.uid()::text = researcher_id::text
    )
  );

-- Mechanical Properties
CREATE POLICY "Users can manage their sample mechanical properties"
  ON public.mechanical_properties
  FOR ALL
  USING (
    sample_id IN (
      SELECT id FROM public.samples 
      WHERE auth.uid()::text = researcher_id::text
    )
  );

-- Linear Attenuation
CREATE POLICY "Users can manage their sample linear attenuation"
  ON public.linear_attenuation
  FOR ALL
  USING (
    sample_id IN (
      SELECT id FROM public.samples 
      WHERE auth.uid()::text = researcher_id::text
    )
  );

-- Beam Qualities
CREATE POLICY "Users can manage their sample beam qualities"
  ON public.beam_qualities
  FOR ALL
  USING (
    sample_id IN (
      SELECT id FROM public.samples 
      WHERE auth.uid()::text = researcher_id::text
    )
  );
