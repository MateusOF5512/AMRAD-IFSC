-- Track whether a Google OAuth user dismissed/completed optional profile onboarding
ALTER TABLE public.researchers
ADD COLUMN IF NOT EXISTS profile_onboarding_completed boolean NOT NULL DEFAULT false;

-- Existing accounts should not see the onboarding modal again
UPDATE public.researchers
SET profile_onboarding_completed = true
WHERE profile_onboarding_completed = false
  AND (
    institution IS NOT NULL
    OR phone_number IS NOT NULL
    OR password_hash IS DISTINCT FROM 'placeholder_hash'
  );
