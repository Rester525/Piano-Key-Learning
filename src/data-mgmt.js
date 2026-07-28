// ═══════════════════════════════════════════════════════════════════
// DATA-MGMT — Export / Import / Reset all progress data
// Pattern: pure compute, no DOM dependency
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEYS = [
  'pkl_stats_sessions',
  'pkl_srs_data',
  'pkl_custom_sets',
  'theme',
];

/**
 * Export all app data as a JSON string.
 * @returns {string} JSON backup
 */
export function exportAllData() {
  const backup = { exportedAt: new Date().toISOString(), version: '1.2.0', data: {} };
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try { backup.data[key] = JSON.parse(raw); }
      catch { backup.data[key] = raw; }
    }
  }
  return JSON.stringify(backup, null, 2);
}

/**
 * Import app data from a JSON backup string.
 * @param {string} json - backup JSON
 * @returns {{ success: boolean, error?: string, restored: number }}
 */
export function importAllData(json) {
  let backup;
  try { backup = JSON.parse(json); }
  catch { return { success: false, error: 'Invalid JSON file.', restored: 0 }; }

  if (!backup.data || typeof backup.data !== 'object') {
    return { success: false, error: 'Not a valid Piano Key Learning backup.', restored: 0 };
  }

  let restored = 0;
  for (const key of STORAGE_KEYS) {
    if (key in backup.data) {
      const value = backup.data[key];
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      restored++;
    }
  }

  return { success: true, restored };
}

/**
 * Reset all app data (keep theme).
 */
export function resetAllData() {
  const keysToClear = STORAGE_KEYS.filter(k => k !== 'theme');
  for (const key of keysToClear) {
    localStorage.removeItem(key);
  }
}
