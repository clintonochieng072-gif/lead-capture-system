/**
 * Add Free Tier + Subscription Tracking + Notifications
 *
 * Changes:
 * 1. Add subscription start/payment tracking fields
 * 2. Create notifications table for lead alerts
 */

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_last_payment_at timestamptz;

COMMENT ON COLUMN public.profiles.subscription_started_at IS 'First successful subscription payment date';
COMMENT ON COLUMN public.profiles.subscription_last_payment_at IS 'Most recent successful subscription payment date';

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_owner_created
  ON public.notifications (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_owner_unread
  ON public.notifications (owner_user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "notifications_insert_none" ON public.notifications;
CREATE POLICY "notifications_insert_none" ON public.notifications
  FOR INSERT
  WITH CHECK (false);
