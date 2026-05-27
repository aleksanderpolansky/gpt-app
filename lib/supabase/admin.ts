// server-only package was not detected in this local install; this file remains server-only by contract and path.

import { createClient } from '@supabase/supabase-js';

type SupabaseAdminClient = ReturnType<typeof createClient>;

let cachedSupabaseAdminClient: SupabaseAdminClient | null = null;

function getRequiredServerEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
"Missing required server environment variable: "
 + name);
  }

  return value;
}

function getSupabaseAdminUrl(): string {
  const serverUrl = process.env.SUPABASE_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = serverUrl || publicUrl;

  if (!url) {
    throw new Error(
"Missing required server environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
);
  }

  return url;
}

export function getSupabaseAdminClient(): SupabaseAdminClient {
  if (cachedSupabaseAdminClient) {
    return cachedSupabaseAdminClient;
  }

  const supabaseUrl = getSupabaseAdminUrl();
  const serviceRoleKey = getRequiredServerEnv(
"SUPABASE_SERVICE_ROLE_KEY"
);

  cachedSupabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        
"X-Client-Info": "gpt-app-server-only-admin",
      },
    },
  });

  return cachedSupabaseAdminClient;
}
