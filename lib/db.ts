import supabaseClient from './supabaseClient';

/**
 * Client-only database helpers
 * All queries use RLS for security (anon key enforces auth.uid() = owner_user_id)
 */

export async function getUserTrackingLinks(userId: string) {
  const { data, error } = await supabaseClient
    .from('tracking_links')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tracking links:', error);
    return [];
  }

  return data || [];
}

export async function getUserLeads(userId: string) {
  const { data, error } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return data || [];
}

export async function getLeadsForLink(linkId: string, userId: string) {
  const { data, error } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('tracking_link_id', linkId)
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads for link:', error);
    return [];
  }

  return data || [];
}

export async function updateTrackingLinkTarget(linkId: string, userId: string, targetUrl: string) {
  try {
    new URL(targetUrl);
  } catch {
    return { error: 'Invalid URL format' };
  }

  const { data, error } = await supabaseClient
    .from('tracking_links')
    .update({ target_url: targetUrl, updated_at: new Date().toISOString() })
    .eq('id', linkId)
    .eq('owner_user_id', userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}
