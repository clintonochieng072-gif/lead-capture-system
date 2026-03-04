-- migration: add optional phone number to user profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number text;

-- index helps if you ever search by phone; not required
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- NOTE: this column is nullable; application enforces presence only after first login.
