/**
 * Lead Capture MVP - PostgreSQL Schema for Supabase
 * 
 * This schema manages:
 * - User profiles (linked to Supabase auth.users)
 * - Tracking links (lead capture URLs)
 * - Captured leads (visitor submissions)
 * 
 * Security:
 * - Row Level Security (RLS) enforces user ownership
 * - Public lead submissions use server-side API (service role)
 * - No direct public access to sensitive data
 * 
 * To deploy:
 * 1. Copy entire SQL
 * 2. Open Supabase project → SQL Editor
 * 3. Paste and Run
 * 4. Verify tables are created
 */

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

/**
 * profiles
 * Links Supabase auth.users to application user data
 */
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  company_name text,
  country text DEFAULT 'KE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
COMMENT ON TABLE public.profiles IS 'User account data linked to Supabase auth.users';

/**
 * tracking_links
 * Unique, shareable links that lead to lead-capture forms
 * Each link has a target URL and captures visitors as leads
 */
CREATE TABLE IF NOT EXISTS public.tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  label text,
  description text,
  target_url text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_owner ON public.tracking_links (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_slug ON public.tracking_links (slug);
CREATE INDEX IF NOT EXISTS idx_tracking_links_is_active ON public.tracking_links (is_active);
COMMENT ON TABLE public.tracking_links IS 'Lead-capture tracking links owned by users';
COMMENT ON COLUMN public.tracking_links.slug IS 'Unique public identifier (e.g., "abc12345")';
COMMENT ON COLUMN public.tracking_links.target_url IS 'URL to redirect visitor after lead submission';

/**
 * leads
 * Captured lead records from tracking link submissions
 */
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id uuid NOT NULL REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_tracking ON public.leads (tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
COMMENT ON TABLE public.leads IS 'Captured leads from tracking link submissions';
COMMENT ON COLUMN public.leads.metadata IS 'JSON: {user_agent, referrer, ip, city, country, etc}';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

/**
 * handle_new_user()
 * Trigger function: Auto-creates profile and default tracking link on signup
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_slug text;
  slug_attempt text;
  attempt_count int := 0;
  max_attempts int := 10;
BEGIN
  -- Insert profile row (from auth.users metadata)
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Generate unique slug for default tracking link (8 chars, alphanumeric)
  -- Retry if collision (rare but possible)
  WHILE attempt_count < max_attempts LOOP
    slug_attempt := substring(
      encode(gen_random_bytes(6), 'hex') from 1 for 8
    );
    
    IF NOT EXISTS (
      SELECT 1 FROM public.tracking_links WHERE slug = slug_attempt
    ) THEN
      new_slug := slug_attempt;
      EXIT;
    END IF;
    
    attempt_count := attempt_count + 1;
  END LOOP;

  -- Fail gracefully if slug generation fails (unlikely)
  IF new_slug IS NULL THEN
    RAISE EXCEPTION 'Failed to generate unique slug after % attempts', max_attempts;
  END IF;

  -- Insert default tracking link
  INSERT INTO public.tracking_links (
    owner_user_id,
    slug,
    label,
    description,
    is_default,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    new_slug,
    'Default Lead Capture Link',
    'Your first tracking link. Set target URL and share to start capturing leads.',
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (slug) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates user profile and default tracking link on sign up';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_insert ON auth.users;
CREATE TRIGGER on_auth_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_insert ON auth.users IS
  'Fires after a new user signs up to create profile and default link';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY profiles_select_self ON public.profiles IS 'Users can only view their own profile';
COMMENT ON POLICY profiles_update_self ON public.profiles IS 'Users can only update their own profile';

-- ============================================================================
-- TRACKING_LINKS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tracking_links_select_own" ON public.tracking_links;
CREATE POLICY "tracking_links_select_own" ON public.tracking_links
  FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "tracking_links_insert_own" ON public.tracking_links;
CREATE POLICY "tracking_links_insert_own" ON public.tracking_links
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "tracking_links_update_own" ON public.tracking_links;
CREATE POLICY "tracking_links_update_own" ON public.tracking_links
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "tracking_links_delete_own" ON public.tracking_links;
CREATE POLICY "tracking_links_delete_own" ON public.tracking_links
  FOR DELETE
  USING (auth.uid() = owner_user_id);

COMMENT ON POLICY tracking_links_select_own ON public.tracking_links IS 'Users can only view their own tracking links';
COMMENT ON POLICY tracking_links_insert_own ON public.tracking_links IS 'Users can only create tracking links for themselves';
COMMENT ON POLICY tracking_links_update_own ON public.tracking_links IS 'Users can only update their own tracking links';
COMMENT ON POLICY tracking_links_delete_own ON public.tracking_links IS 'Users can only delete their own tracking links';

-- ============================================================================
-- LEADS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "leads_select_own" ON public.leads;
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
CREATE POLICY "leads_insert_own" ON public.leads
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

COMMENT ON POLICY leads_select_own ON public.leads IS 'Users can only view leads they captured';
COMMENT ON POLICY leads_insert_own ON public.leads IS 'Internal use only - leads are inserted server-side (service role)';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- PUBLIC LEAD SUBMISSION FLOW:
-- ✓ Visitor submits form on public page /t/:slug
-- ✓ POST to /api/track/:slug (Next.js server route)
-- ✓ Server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
-- ✓ Server resolves slug → finds tracking_link
-- ✓ Server inserts lead with verified owner_user_id
-- ✓ Server redirects visitor to target_url
-- 
-- This prevents:
-- ✗ Malicious clients inserting arbitrary owner_user_id values
-- ✗ Exposing sensitive tracking_link.target_url to public
-- ✗ Exposing tracking_links table to anonymous users
-- 
-- ============================================================================

