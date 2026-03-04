// shared TypeScript interfaces for database records

export interface Profile {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  country?: string | null;
  subscription_active?: boolean;
  subscription_expires_at?: string | null;
  plan?: string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;

  // new optional field used for first‑login flow
  phone_number?: string | null;
}
