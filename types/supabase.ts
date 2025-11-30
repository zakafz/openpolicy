export interface UsersRow {
  id: string;
  auth_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  provider: string | null;
  provider_user_id: string | null;
  raw_user: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}
export interface WorkspaceRow {
  id: string;
  name: string | null;
  logo: string | null;
  logo_path: string | null;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  plan: string | null;
  slug: string | null;
  metadata: Record<string, any> | null;
  support_email: string | null;
  disable_icon: boolean;
  return_url: string | null;
  custom_domain: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  payment_failed_at: string | null;
}

