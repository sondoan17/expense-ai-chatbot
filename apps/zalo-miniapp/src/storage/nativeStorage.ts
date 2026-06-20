import { nativeStorage } from 'zmp-sdk/apis';

export function getNativeString(key: string): string | null {
  try {
    return nativeStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function setNativeString(key: string, value: string): void {
  nativeStorage.setItem(key, value);
}

export function removeNativeItem(key: string): void {
  nativeStorage.removeItem(key);
}

export function getNativeJson<T>(key: string, fallback: T): T {
  const value = getNativeString(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function setNativeJson<T>(key: string, value: T): void {
  setNativeString(key, JSON.stringify(value));
}
