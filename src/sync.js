// ═══════════════════════════════════════════════════════════════════
// SYNC — Bidirectional Cloud Sync (Stats, SRS, Sets, Curriculum)
// ═══════════════════════════════════════════════════════════════════

import { getSupabase } from './supabase.js';

const STATS_KEY = 'pkl_stats_sessions';
const SRS_KEY = 'pkl_srs_data';
const SETS_KEY = 'pkl_custom_sets';
const CURRICULUM_KEY = 'pkl_curriculum';

// ─── PULL FROM CLOUD ────────────────────────────────────────────────

/** Pull all user data from Supabase and merge into localStorage. */
export async function pullFromCloud() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { synced: 0 };

  let synced = 0;

  // Pull stats
  const { data: statsRows } = await sb
    .from('stats_sessions')
    .select('data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (statsRows?.length > 0 && statsRows[0].data) {
    localStorage.setItem(STATS_KEY, JSON.stringify(statsRows[0].data));
    synced++;
  }

  // Pull user_data (SRS, sets, curriculum)
  const { data: userData } = await sb
    .from('user_data')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (userData) {
    if (userData.srs_data) {
      localStorage.setItem(SRS_KEY, JSON.stringify(userData.srs_data));
      synced++;
    }
    if (userData.custom_sets) {
      localStorage.setItem(SETS_KEY, JSON.stringify(userData.custom_sets));
      synced++;
    }
    if (userData.curriculum) {
      localStorage.setItem(CURRICULUM_KEY, JSON.stringify(userData.curriculum));
      synced++;
    }
  }

  return { synced };
}

// ─── PUSH TO CLOUD ──────────────────────────────────────────────────

/**
 * Push stats to cloud. Replaces the user's stats row entirely.
 * Call after significant practice sessions (debounced).
 */
export async function pushStats() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return;

  let data;
  try { data = JSON.parse(raw); } catch { return; }

  await sb.from('stats_sessions').upsert({
    user_id: user.id,
    data,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

/**
 * Push SRS data, custom sets, and curriculum to cloud.
 * Call after any practice session (debounced).
 */
export async function pushUserData() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const srsRaw = localStorage.getItem(SRS_KEY);
  const setsRaw = localStorage.getItem(SETS_KEY);
  const curriculumRaw = localStorage.getItem(CURRICULUM_KEY);

  let srs = {}, sets = [], curriculum = {};
  try { if (srsRaw) srs = JSON.parse(srsRaw); } catch {}
  try { if (setsRaw) sets = JSON.parse(setsRaw); } catch {}
  try { if (curriculumRaw) curriculum = JSON.parse(curriculumRaw); } catch {}

  await sb.from('user_data').upsert({
    user_id: user.id,
    srs_data: srs,
    custom_sets: sets,
    curriculum,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

/** Push both stats and user data to cloud. */
export async function pushAllToCloud() {
  await pushStats();
  await pushUserData();
}

// ─── DEBOUNCED SYNC ─────────────────────────────────────────────────

let _syncTimer = null;

/** Schedule a debounced cloud push (fires 2s after last call). */
export function scheduleCloudSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    pushAllToCloud().catch(() => { /* offline — silent */ });
  }, 2000);
}

/** Cancel pending sync (e.g., on logout). */
export function cancelPendingSync() {
  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
    // Flush immediately before logout
    pushAllToCloud().catch(() => {});
  }
}
