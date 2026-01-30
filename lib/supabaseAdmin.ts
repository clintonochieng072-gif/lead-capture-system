import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (typeof window !== 'undefined') {
  // Prevent accidental client-side usage
  throw new Error('supabaseAdmin must only be imported from server-side code');
}

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable for Supabase admin client');
}

if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable for Supabase admin client');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey);
export default supabaseAdmin;
