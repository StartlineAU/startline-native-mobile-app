import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { KeyValueStorageInterface } from 'aws-amplify/utils';

const INDEX_KEY = 'startline.amplify.index';
const CHUNK_SIZE = 1700;
const WEB_PREFIX = 'startline.amplify.';

// An unsigned iOS Simulator build has no Keychain application identifier, so
// SecureStore refuses every operation. Keep a development-only, in-memory
// fallback so auth can be exercised without weakening or persisting tokens in
// real builds. Production still fails closed.
const developmentMemory = new Map<string, string>();
let warnedAboutDevelopmentFallback = false;

function allowDevelopmentFallback(error: unknown): boolean {
  if (!__DEV__) throw error;
  if (!warnedAboutDevelopmentFallback) {
    warnedAboutDevelopmentFallback = true;
    console.warn(
      'SecureStore is unavailable in this development build. Cognito tokens will last only for this app session.',
      error,
    );
  }
  return true;
}

function webStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function storageKey(key: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
}

async function readIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...new Set(keys)]));
}

export class StartlineSecureStorage implements KeyValueStorageInterface {
  async getItem(key: string): Promise<string | null> {
    const web = webStorage();
    if (web) return web.getItem(`${WEB_PREFIX}${key}`);

    try {
      const hashed = await storageKey(key);
      const countRaw = await SecureStore.getItemAsync(`${hashed}.count`);
      if (!countRaw) return developmentMemory.get(key) ?? null;
      const count = Number(countRaw);
      if (!Number.isInteger(count) || count < 0) return null;

      const chunks: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const chunk = await SecureStore.getItemAsync(`${hashed}.${i}`);
        if (chunk == null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    } catch (error) {
      allowDevelopmentFallback(error);
      return developmentMemory.get(key) ?? null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const web = webStorage();
    if (web) {
      web.setItem(`${WEB_PREFIX}${key}`, value);
      return;
    }

    try {
      const hashed = await storageKey(key);
      const previousCountRaw = await SecureStore.getItemAsync(`${hashed}.count`);
      const previousCount = Number(previousCountRaw ?? 0);
      const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];

      for (let i = 0; i < chunks.length; i += 1) {
        await SecureStore.setItemAsync(`${hashed}.${i}`, chunks[i]);
      }
      for (let i = chunks.length; i < previousCount; i += 1) {
        await SecureStore.deleteItemAsync(`${hashed}.${i}`);
      }
      await SecureStore.setItemAsync(`${hashed}.count`, String(chunks.length));

      const index = await readIndex();
      if (!index.includes(hashed)) await writeIndex([...index, hashed]);
    } catch (error) {
      allowDevelopmentFallback(error);
      developmentMemory.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    const web = webStorage();
    if (web) {
      web.removeItem(`${WEB_PREFIX}${key}`);
      return;
    }

    try {
      const hashed = await storageKey(key);
      const countRaw = await SecureStore.getItemAsync(`${hashed}.count`);
      const count = Number(countRaw ?? 0);
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${hashed}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${hashed}.count`);
      const index = await readIndex();
      await writeIndex(index.filter((item) => item !== hashed));
    } catch (error) {
      allowDevelopmentFallback(error);
    } finally {
      developmentMemory.delete(key);
    }
  }

  async clear(): Promise<void> {
    const web = webStorage();
    if (web) {
      const keys: string[] = [];
      for (let i = 0; i < web.length; i += 1) {
        const key = web.key(i);
        if (key?.startsWith(WEB_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => web.removeItem(key));
      return;
    }

    developmentMemory.clear();
    try {
      const index = await readIndex();
      for (const hashed of index) {
        const countRaw = await SecureStore.getItemAsync(`${hashed}.count`);
        const count = Number(countRaw ?? 0);
        for (let i = 0; i < count; i += 1) {
          await SecureStore.deleteItemAsync(`${hashed}.${i}`);
        }
        await SecureStore.deleteItemAsync(`${hashed}.count`);
      }
      await SecureStore.deleteItemAsync(INDEX_KEY);
    } catch (error) {
      allowDevelopmentFallback(error);
    }
  }
}

export const secureStorage = new StartlineSecureStorage();
