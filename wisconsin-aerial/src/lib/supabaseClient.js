import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The app runs fully on localStorage until these are set (see supabase/README.md),
// so every caller must check isSupabaseConfigured() before assuming `supabase` is usable.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}
