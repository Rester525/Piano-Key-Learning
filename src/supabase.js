// ═══════════════════════════════════════════════════════════════════
// SUPABASE — Client Initialization
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://fyilcsyjpikfrmlpvkxl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_72-sgw6A9yRmDcICfVvsvw_aekoQMr-';

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let _client = null;

/**
 * Get or create the Supabase client. Lazily loads the SDK from CDN.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function getSupabase() {
  if (_client) return _client;

  // Load Supabase SDK from ESM CDN (no build step needed)
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
