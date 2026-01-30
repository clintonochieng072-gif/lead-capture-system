import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // In dev, it's fine to throw so the developer fills env
  console.warn('Missing NEXT_PUBLIC_SUPABASE_* env vars');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true }
});

export default supabaseClient;
