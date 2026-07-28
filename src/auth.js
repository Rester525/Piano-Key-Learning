// ═══════════════════════════════════════════════════════════════════
// AUTH — Signup, Login, Logout, Session Management
// ═══════════════════════════════════════════════════════════════════

import { getSupabase } from './supabase.js';

// ─── SIGNUP / LOGIN ──────────────────────────────────────────────────

/** Sign up with email + password. Returns { user, error }. */
export async function signUp(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

/** Sign in with email + password. Returns { user, error }. */
export async function signIn(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

/** Sign in with Google OAuth. Redirects to Google, returns to app after. */
export async function signInWithGoogle() {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) return { error: error.message };
  return { error: null };
}

/** Sign out. */
export async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
}

// ─── SESSION ─────────────────────────────────────────────────────────

/** Get the current session. Returns { user } or { user: null }. */
export async function getSession() {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

/** Listen for auth state changes (login, logout, token refresh). */
export function onAuthStateChange(callback) {
  getSupabase().then(sb => {
    sb.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user ?? null);
    });
  });
}

// ─── PROFILE ─────────────────────────────────────────────────────────

/** Get or create a profile row for the current user. */
export async function ensureProfile() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  // Upsert profile
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: user.id, email: user.email, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) console.warn('Profile upsert error:', error.message);
  return data;
}
