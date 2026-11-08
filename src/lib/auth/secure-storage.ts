import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { KeyValueStorageInterface } from 'aws-amplify/utils';

const INDEX_KEY = 'startline.amplify.index';
const CHUNK_SIZE = 1700;
const WEB_PREFIX = 'startline.amplify.';

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

    const hashed = await storageKey(key);
    const countRaw = await SecureStore.getItemAsync(`${hashed}.count`);
    if (!countRaw) return null;
    const count = Number(countRaw);
    if (!Number.isInteger(count) || count < 0) return null;

    const chunks: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const chunk = await SecureStore.getItemAsync(`${hashed}.${i}`);
      if (chunk == null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  }

  async setItem(key: string, value: string): Promise<void> {
    const web = webStorage();
    if (web) {
      web.setItem(`${WEB_PREFIX}${key}`, value);
      return;
    }

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
  }

  async removeItem(key: string): Promise<void> {
    const web = webStorage();
    if (web) {
      web.removeItem(`${WEB_PREFIX}${key}`);
      return;
    }

    const hashed = await storageKey(key);
    const countRaw = await SecureStore.getItemAsync(`${hashed}.count`);
    const count = Number(countRaw ?? 0);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(`${hashed}.${i}`);
    }
    await SecureStore.deleteItemAsync(`${hashed}.count`);
    const index = await readIndex();
    await writeIndex(index.filter((item) => item !== hashed));
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
  }
}

export const secureStorage = new StartlineSecureStorage();
