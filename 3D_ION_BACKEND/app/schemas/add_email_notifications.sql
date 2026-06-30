-- AMRAD: Add email_notifications column to researchers table
-- Execute this in Supabase SQL Editor

-- Add email_notifications column to researchers table
ALTER TABLE public.researchers 
ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;

-- Create index for email_notifications for better query performance
CREATE INDEX idx_researchers_email_notifications 
ON public.researchers(email_notifications);

-- Add comment for documentation
COMMENT ON COLUMN public.researchers.email_notifications IS 'Indicates whether the user wants to receive email notifications';
