import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

let cached: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cached) return cached;
  const url = env.PUBLIC_SUPABASE_URL;
  const anon = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Supabase env vars not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.'
    );
  }
  cached = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}
