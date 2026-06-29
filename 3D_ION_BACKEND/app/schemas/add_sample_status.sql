-- ION3D Platform: Add status column to samples table
-- Execute this in Supabase SQL Editor

-- Create ENUM type for sample status
CREATE TYPE sample_status AS ENUM (
  'Submitted',
  'Revisions',
  'Review',
  'Approved'
);

-- Add status column to samples table with default 'Submitted'
ALTER TABLE public.samples
ADD COLUMN status sample_status NOT NULL DEFAULT 'Submitted';

-- Create index for status for better query performance
CREATE INDEX idx_samples_status 
ON public.samples(status);

-- Add comment for documentation
COMMENT ON COLUMN public.samples.status IS 'Status of the sample experiment: Submitted (initial), Revisions (needs changes), Review (being reviewed), Approved (approved)';

