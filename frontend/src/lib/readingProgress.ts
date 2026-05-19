export type LastReading = {
  surahNo: number;
  surahNameAr: string;
  ayahNo: number;
};

export type HeartSurahProgress = {
  surahNo: number;
  surahNameAr: string;
  lastAyahNo: number;
  totalAyahs: number;
  progressPercent: number;
  mistakes: number;
  updatedAt: string;
  completedAt?: string;
};

const LAST_READING_STORAGE_PREFIX = 'noor:lastReading';
const HEART_PROGRESS_STORAGE_PREFIX = 'noor:heartProgress';
const LEGACY_STORAGE_KEYS = ['noor:lastReading', 'noor:userProgress', 'noor:surahCompletions'];

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const scopedKey = (prefix: string, uid?: string | null) => `${prefix}:${uid || 'anonymous'}`;

function readJson<T>(storageKey: string): T | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(storageKey: string, value: unknown) {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey, JSON.stringify(value));
}

export function getLastReadingStorageKey(uid?: string | null) {
  return scopedKey(LAST_READING_STORAGE_PREFIX, uid);
}

export function getHeartProgressStorageKey(uid?: string | null) {
  return scopedKey(HEART_PROGRESS_STORAGE_PREFIX, uid);
}

export function loadLastReading(uid?: string | null): LastReading | null {
  return readJson<LastReading>(getLastReadingStorageKey(uid));
}

export function saveLastReading(uid: string | null | undefined, value: LastReading) {
  writeJson(getLastReadingStorageKey(uid), value);
}

export function loadHeartProgress(uid?: string | null): Record<string, HeartSurahProgress> {
  return readJson<Record<string, HeartSurahProgress>>(getHeartProgressStorageKey(uid)) || {};
}

export function saveHeartProgress(uid: string | null | undefined, value: Record<string, HeartSurahProgress>) {
  writeJson(getHeartProgressStorageKey(uid), value);
}

export function clearReadingProgressStorage() {
  if (!isBrowser()) return;

  const prefixes = [LAST_READING_STORAGE_PREFIX, HEART_PROGRESS_STORAGE_PREFIX];
  const keysToRemove = new Set<string>(LEGACY_STORAGE_KEYS);

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (prefixes.some((prefix) => key.startsWith(`${prefix}:`))) {
      keysToRemove.add(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}