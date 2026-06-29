-- ION3D Platform: Sample Status History Table
-- Purpose: Comprehensive tracking of all sample status transitions
-- Execute this in Supabase SQL Editor

-- Create table for status history
CREATE TABLE public.sample_status_history (
  id BIGSERIAL PRIMARY KEY,

  -- Foreign key to samples table
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,

  -- Status transitions
  old_status public.sample_status,
  new_status public.sample_status NOT NULL,

  -- User who made the change
  changed_by_user_id uuid REFERENCES public.researchers(id),
  changed_by_name text,
  changed_by_email text,
  changed_by_role text, -- 'pesquisador' or 'admin'

  -- Optional comment (especially for Revisions status)
  comment text,

  -- Flag for system-generated actions
  is_system_action boolean DEFAULT false,

  -- Timestamp of the change
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  -- Add indexes for common queries
  CONSTRAINT fk_sample_history_sample FOREIGN KEY (sample_id) REFERENCES public.samples(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_sample_status_history_sample_id 
ON public.sample_status_history(sample_id);

CREATE INDEX idx_sample_status_history_new_status 
ON public.sample_status_history(new_status);

CREATE INDEX idx_sample_status_history_changed_by_user_id 
ON public.sample_status_history(changed_by_user_id);

CREATE INDEX idx_sample_status_history_created_at 
ON public.sample_status_history(created_at DESC);

-- Composite index for common queries (sample_id + created_at)
CREATE INDEX idx_sample_status_history_sample_created 
ON public.sample_status_history(sample_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.sample_status_history IS 'Audit trail for all sample status transitions - DO NOT EDIT DIRECTLY';
COMMENT ON COLUMN public.sample_status_history.id IS 'Unique identifier for this history entry';
COMMENT ON COLUMN public.sample_status_history.sample_id IS 'Reference to the sample being tracked';
COMMENT ON COLUMN public.sample_status_history.old_status IS 'Previous status (NULL if this is the initial submission)';
COMMENT ON COLUMN public.sample_status_history.new_status IS 'New status assigned';
COMMENT ON COLUMN public.sample_status_history.changed_by_user_id IS 'ID of the user who made the change';
COMMENT ON COLUMN public.sample_status_history.changed_by_name IS 'Name of the user who made the change (denormalized for auditability)';
COMMENT ON COLUMN public.sample_status_history.changed_by_email IS 'Email of the user who made the change (denormalized for auditability)';
COMMENT ON COLUMN public.sample_status_history.changed_by_role IS 'Role of the user (admin or pesquisador) at time of change';
COMMENT ON COLUMN public.sample_status_history.comment IS 'Optional explanation for the status change (e.g., revision reasons)';
COMMENT ON COLUMN public.sample_status_history.is_system_action IS 'TRUE if change was system-generated (e.g., initial submission)';
COMMENT ON COLUMN public.sample_status_history.created_at IS 'When this status change occurred';

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.sample_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Researchers can view history for their own samples
CREATE POLICY "Researchers view own sample history"
  ON public.sample_status_history
  FOR SELECT
  USING (
    sample_id IN (
      SELECT id FROM public.samples 
      WHERE researcher_id = auth.uid()
    )
  );

-- Policy: Admins can view all history
CREATE POLICY "Admins view all history"
  ON public.sample_status_history
  FOR SELECT
  USING (
    (SELECT user_type FROM public.researchers WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Only backend (service role) can insert
-- This ensures history entries are only created through our API
-- Note: With service role key, we bypass RLS, so this is for documentation

PRINT 'Sample status history table created successfully!';
