import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Create or update a profile for a user (server-side only)
 * Uses upsert to avoid duplicate key error on returning users
 */
export async function createProfile(
  userId: string,
  email: string,
  fullName?: string,
  referrerId?: string
) {
  const profileData: Record<string, any> = {
    user_id: userId,
    email,
    full_name: fullName || email.split('@')[0],
    updated_at: new Date().toISOString()
  };

  // Only include referrer_id if provided (don't override existing on returning users)
  if (referrerId) {
    profileData.referrer_id = referrerId;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      profileData,
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Profile creation error:', error);
    return null;
  }

  return data;
}

/**
 * Create a default tracking link for a user (server-side only)
 * Generates a unique 8-character slug
 */
export async function createDefaultTrackingLink(userId: string) {
  // Generate unique slug (max 10 attempts)
  let slug = '';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomSlug = Math.random().toString(36).substring(2, 10);

    const { data: exists } = await supabaseAdmin
      .from('tracking_links')
      .select('id', { count: 'exact' })
      .eq('slug', randomSlug);

    if (!exists || exists.length === 0) {
      slug = randomSlug;
      break;
    }
    attempts++;
  }

  if (!slug) {
    console.error('Failed to generate unique slug after max attempts');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('tracking_links')
    .insert([
      {
        owner_user_id: userId,
        slug,
        label: 'My First Lead Tracker',
        description: 'Set your target URL and start capturing leads',
        target_url: null,
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Tracking link creation error:', error);
    return null;
  }

  return data;
}
