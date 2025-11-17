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
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  plan: string | null;
  slug: string | null;
  metadata: Record<string, any> | null;
}
