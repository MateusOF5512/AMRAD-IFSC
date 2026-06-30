-- Default researcher status to regular for new and existing accounts.
-- Irregular status should only be assigned manually by an admin.

ALTER TABLE public.researchers
  ALTER COLUMN status SET DEFAULT 'regular';

UPDATE public.researchers
SET status = 'regular'
WHERE status IS NULL OR trim(status) = '';
