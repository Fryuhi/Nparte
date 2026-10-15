export const NPARTE_PROJECT_KEY = "AQ.Ab8RN6K4piF0fe3XpWD73Bi9sJfouwPM2V2Sv9J7DggpwJBmqw";

export interface GeminiKeyEntry {
  key: string;
  slot: 'primary' | 'backup2' | 'backup3' | 'default';
  label: string;
}

let activeKeyIndex = 0;

export const getAvailableGeminiKeyEntries = (): GeminiKeyEntry[] => {
  const entries: GeminiKeyEntry[] = [];
  const added = new Set<string>();

  // 1. Primary Key (GEMINI_API_KEY)
  let primaryKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      primaryKey = localStorage.getItem('user_gemini_api_key') || '';
    }
  } catch (_) {}
  if (!primaryKey && typeof process !== 'undefined' && process.env) {
    primaryKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  if (!primaryKey && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    primaryKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';
  }
  primaryKey = primaryKey.trim();
  if (primaryKey && primaryKey !== 'undefined' && primaryKey !== 'null' && !added.has(primaryKey)) {
    entries.push({ key: primaryKey, slot: 'primary', label: 'Primary (GEMINI_API_KEY)' });
    added.add(primaryKey);
  }

  // 2. Backup Key 2 (GEMINI_API_KEY_2)
  let backupKey2 = '';
  try {
    if (typeof localStorage !== 'undefined') {
      backupKey2 = localStorage.getItem('user_gemini_api_key_2') || '';
    }
  } catch (_) {}
  if (!backupKey2 && typeof process !== 'undefined' && process.env) {
    backupKey2 = process.env.GEMINI_API_KEY_2 || '';
  }
  if (!backupKey2 && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    backupKey2 = (import.meta as any).env.VITE_GEMINI_API_KEY_2 || '';
  }
  backupKey2 = backupKey2.trim();
  if (backupKey2 && backupKey2 !== 'undefined' && backupKey2 !== 'null' && !added.has(backupKey2)) {
    entries.push({ key: backupKey2, slot: 'backup2', label: 'Backup 1 (GEMINI_API_KEY_2)' });
    added.add(backupKey2);
  }

  // 3. Backup Key 3 (GEMINI_API_KEY_3)
  let backupKey3 = '';
  try {
    if (typeof localStorage !== 'undefined') {
      backupKey3 = localStorage.getItem('user_gemini_api_key_3') || '';
    }
  } catch (_) {}
  if (!backupKey3 && typeof process !== 'undefined' && process.env) {
    backupKey3 = process.env.GEMINI_API_KEY_3 || '';
  }
  if (!backupKey3 && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    backupKey3 = (import.meta as any).env.VITE_GEMINI_API_KEY_3 || '';
  }
  backupKey3 = backupKey3.trim();
  if (backupKey3 && backupKey3 !== 'undefined' && backupKey3 !== 'null' && !added.has(backupKey3)) {
    entries.push({ key: backupKey3, slot: 'backup3', label: 'Backup 2 (GEMINI_API_KEY_3)' });
    added.add(backupKey3);
  }

  // 4. Default Project Secret Fallback
  if (!added.has(NPARTE_PROJECT_KEY)) {
    entries.push({ key: NPARTE_PROJECT_KEY, slot: 'default', label: 'Project Fallback' });
    added.add(NPARTE_PROJECT_KEY);
  }

  return entries;
};

export const getAvailableGeminiApiKeys = (): string[] => {
  return getAvailableGeminiKeyEntries().map(e => e.key);
};

export const getGlobalApiKey = (preferredIndex?: number): string => {
  const keys = getAvailableGeminiApiKeys();
  if (preferredIndex !== undefined && preferredIndex >= 0 && preferredIndex < keys.length) {
    return keys[preferredIndex];
  }
  const idx = activeKeyIndex % (keys.length || 1);
  return keys[idx] || NPARTE_PROJECT_KEY;
};

export const rotateToNextApiKey = (): string => {
  const keys = getAvailableGeminiApiKeys();
  if (keys.length > 1) {
    activeKeyIndex = (activeKeyIndex + 1) % keys.length;
    console.warn(`[AI Key Rotation] Switched active key to #${activeKeyIndex + 1}/${keys.length}`);
  }
  return keys[activeKeyIndex % keys.length] || NPARTE_PROJECT_KEY;
};
