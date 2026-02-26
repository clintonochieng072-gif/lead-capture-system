/**
 * Add one-time commission notification tracking fields
 *
 * This ensures LCS sends affiliate commission payload only once
 * on initial subscription activation for affiliate-referred users.
 */

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS commission_notified boolean DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS commission_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_commission_notified
ON public.profiles (commission_notified);

COMMENT ON COLUMN public.profiles.commission_notified IS
  'True once initial affiliate commission notification has been successfully sent';

COMMENT ON COLUMN public.profiles.commission_notified_at IS
  'Timestamp when initial affiliate commission notification was marked as sent';
