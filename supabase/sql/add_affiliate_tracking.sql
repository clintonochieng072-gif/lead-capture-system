/**
 * Add Affiliate Tracking Support
 * 
 * This migration adds support for tracking affiliate referrals and commission notifications.
 * 
 * Changes:
 * 1. Add referrer_id column to profiles table
 * 2. Create commission_notifications table for idempotency tracking
 * 3. Add indexes for performance
 * 
 * To deploy:
 * 1. Copy entire SQL
 * 2. Open Supabase project → SQL Editor
 * 3. Paste and Run
 */

-- ============================================================================
-- ADD REFERRER_ID TO PROFILES
-- ============================================================================

-- Add referrer_id column to track which affiliate referred this user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referrer_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON public.profiles (referrer_id);

COMMENT ON COLUMN public.profiles.referrer_id IS 'Affiliate ID of the referrer (if user came through affiliate link)';

-- ============================================================================
-- CREATE COMMISSION_NOTIFICATIONS TABLE
-- ============================================================================

/**
 * commission_notifications
 * Tracks all commission notifications sent to the Affiliate System
 * Ensures idempotency (no duplicate notifications for same user/payment)
 */
CREATE TABLE IF NOT EXISTS public.commission_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id text NOT NULL,
  payment_reference text NOT NULL,
  user_email text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_data jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure we only notify once per user/payment combination
  UNIQUE(user_id, payment_reference)
);

CREATE INDEX IF NOT EXISTS idx_commission_notifications_user_id ON public.commission_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_commission_notifications_referrer_id ON public.commission_notifications (referrer_id);
CREATE INDEX IF NOT EXISTS idx_commission_notifications_status ON public.commission_notifications (status);
CREATE INDEX IF NOT EXISTS idx_commission_notifications_payment_ref ON public.commission_notifications (payment_reference);

COMMENT ON TABLE public.commission_notifications IS 'Tracks commission notifications sent to Affiliate System';
COMMENT ON COLUMN public.commission_notifications.status IS 'Status: pending, success, failed';
COMMENT ON COLUMN public.commission_notifications.retry_count IS 'Number of retry attempts for failed notifications';

-- ============================================================================
-- RLS FOR COMMISSION_NOTIFICATIONS
-- ============================================================================

ALTER TABLE public.commission_notifications ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (no user access needed)
DROP POLICY IF EXISTS "commission_notifications_no_direct_access" ON public.commission_notifications;
CREATE POLICY "commission_notifications_no_direct_access" ON public.commission_notifications
  FOR ALL
  USING (false);

COMMENT ON POLICY commission_notifications_no_direct_access ON public.commission_notifications IS 
  'Server-only access using service role key';

