
import { Novel, GlobalConfig, DEFAULT_SAFETY_SETTINGS } from '../types';

const DB_NAME = 'NParteDB';
const LEGACY_DB_NAME = 'NovelArchitectDB';
const DB_VERSION = 1;
const STORE_NOVELS = 'novels';
const STORE_SETTINGS = 'settings';

// --- DATABASE INITIALIZATION ---

const openSpecificDB = (name: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOVELS)) {
        db.createObjectStore(STORE_NOVELS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Could not open database");
    };
  });
};

let migrationChecked = false;

const openDB = async (): Promise<IDBDatabase> => {
  const currentDb = await openSpecificDB(DB_NAME);

  if (!migrationChecked && typeof indexedDB !== 'undefined') {
    migrationChecked = true;
    try {
      // Check if current DB is empty and legacy exists
      const novelsInCurrent = await new Promise<Novel[]>((resolve) => {
        const tx = currentDb.transaction(STORE_NOVELS, 'readonly');
        const req = tx.objectStore(STORE_NOVELS).getAll();
        req.onsuccess = () => resolve(req.result as Novel[]);
        req.onerror = () => resolve([]);
      });

      if (novelsInCurrent.length === 0) {
        // Try reading legacy DB
        const legacyDb = await openSpecificDB(LEGACY_DB_NAME);
        const legacyNovels = await new Promise<Novel[]>((resolve) => {
          const tx = legacyDb.transaction(STORE_NOVELS, 'readonly');
          const req = tx.objectStore(STORE_NOVELS).getAll();
          req.onsuccess = () => resolve(req.result as Novel[]);
          req.onerror = () => resolve([]);
        });

        if (legacyNovels.length > 0) {
          const writeTx = currentDb.transaction(STORE_NOVELS, 'readwrite');
          const store = writeTx.objectStore(STORE_NOVELS);
          for (const novel of legacyNovels) {
            store.put(novel);
          }
        }
      }
    } catch (e) {
      // Migration fail non-fatal
      console.warn("Legacy DB check skipped:", e);
    }
  }

  return currentDb;
};

// --- NOVEL OPERATIONS ---

export const getNovels = async (): Promise<Novel[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NOVELS, 'readonly');
    const store = transaction.objectStore(STORE_NOVELS);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by updatedAt descending (newest first)
      const novels = request.result as Novel[];
      resolve(novels.sort((a, b) => b.updatedAt - a.updatedAt));
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveNovel = async (novel: Novel): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NOVELS, 'readwrite');
    const store = transaction.objectStore(STORE_NOVELS);
    
    // Ensure timestamp is updated
    const updatedNovel = { ...novel, updatedAt: Date.now() };
    const request = store.put(updatedNovel);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteNovel = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NOVELS, 'readwrite');
    const store = transaction.objectStore(STORE_NOVELS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- CONFIG OPERATIONS ---

export const getGlobalConfig = async (): Promise<GlobalConfig> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get('global_config');

    request.onsuccess = () => {
      const result = request.result;
      const savedAnimDisabled = typeof localStorage !== 'undefined'
        ? localStorage.getItem('user_disable_animations') === 'true'
        : false;

      // Default config
      const defaultConfig: GlobalConfig = { 
        instructionMode: 'build',
        customInstruction: '',
        instructionPresets: [],
        activeInstructionIds: [],
        styles: [], 
        temperature: 0.7,
        thinkingLevel: 'Medium',
        safetySettings: { ...DEFAULT_SAFETY_SETTINGS },
        chapterTargetWordCount: 0, // Default unlimited
        disableAnimations: savedAnimDisabled
      };
      
      if (result && result.value) {
         const merged = { ...defaultConfig, ...result.value };
         if (typeof localStorage !== 'undefined' && localStorage.getItem('user_disable_animations') !== null) {
           merged.disableAnimations = localStorage.getItem('user_disable_animations') === 'true';
         }
         resolve(merged);
      } else {
         resolve(defaultConfig);
      }
    };
    request.onerror = () => {
      // Return default on error
      resolve({ styles: [], temperature: 0.7, chapterTargetWordCount: 0 });
    };
  });
};

export const saveGlobalConfig = async (config: GlobalConfig): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    try {
      const isOff = Boolean(config.disableAnimations);
      localStorage.setItem('user_disable_animations', isOff ? 'true' : 'false');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('disable-animations', isOff);
        document.body.classList.toggle('disable-animations', isOff);
      }
    } catch (_) {}
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ id: 'global_config', value: config });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- HELPER ---

export const createNovel = (title: string, type: 'build' | 'fixing' | 'fanfic' = 'build', description?: string, worldLore?: string): Novel => {
  return {
    id: crypto.randomUUID(),
    title,
    type,
    worldLore,
    description,
    loreLockEnabled: true, // Default to true
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [],
  };
};
