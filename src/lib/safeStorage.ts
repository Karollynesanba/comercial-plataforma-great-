// Small utility to safely use Web Storage in embedded/iframe contexts.
// Some browsers block storage access in third-party iframes, which can crash the app.

type StorageKey = string;

type StorageValue = string;

export const PLATFORM_STORAGE_RESET_VERSION = '2026-04-10-commercial-reset-v3';

export function safeGetItem(key: StorageKey): StorageValue | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: StorageKey, value: StorageValue): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function safeRemoveItem(key: StorageKey): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function canUseLocalStorage(): boolean {
  try {
    const k = '__storage_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function resetGreatPlatformStorageIfNeeded(
  resetVersion = PLATFORM_STORAGE_RESET_VERSION
): boolean {
  if (!canUseLocalStorage()) return false;

  try {
    const markerKey = 'great_storage_reset_version';
    if (window.localStorage.getItem(markerKey) === resetVersion) {
      return false;
    }

    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;

      if (
        key.startsWith('great_') ||
        key.startsWith('ceo_notes_') ||
        key === 'deadline_alarm_sound'
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.setItem(markerKey, resetVersion);

    return keysToRemove.length > 0;
  } catch {
    return false;
  }
}
