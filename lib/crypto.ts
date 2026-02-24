/**
 * AES-GCM token encryption using the Web Crypto API.
 * The derived key is stored separately so the token can be decrypted on reload.
 */

import { STORAGE_KEYS } from '@/config/constants'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY)

  if (stored) {
    const rawKey = base64ToBuffer(stored)
    const rawKeyBuffer = rawKey.buffer.slice(0) as ArrayBuffer
    return crypto.subtle.importKey('raw', rawKeyBuffer, { name: ALGORITHM }, true, [
      'encrypt',
      'decrypt',
    ])
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  )

  const exportedKey = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, bufferToBase64(exportedKey as ArrayBuffer))

  return key
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getOrCreateKey()
  const ivArray = new Uint8Array(IV_LENGTH)
  crypto.getRandomValues(ivArray)
  const iv = ivArray.buffer.slice(0, IV_LENGTH) as ArrayBuffer
  const encoded = new TextEncoder().encode(token)

  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)

  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength)
  combined.set(ivArray, 0)
  combined.set(new Uint8Array(encrypted), IV_LENGTH)

  return bufferToBase64(combined.buffer as ArrayBuffer)
}

export async function decryptToken(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = base64ToBuffer(encryptedData)

  const iv = combined.slice(0, IV_LENGTH).buffer.slice(0) as ArrayBuffer
  const data = combined.slice(IV_LENGTH).buffer.slice(0) as ArrayBuffer

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data)

  return new TextDecoder().decode(decrypted)
}

export function clearEncryptionKey(): void {
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY)
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.GITHUB_CONFIG)
}

export async function saveToken(token: string): Promise<void> {
  const encrypted = await encryptToken(token)
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_TOKEN, encrypted)
}

export async function loadToken(): Promise<string | null> {
  const encrypted = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_TOKEN)
  if (!encrypted) return null

  try {
    return await decryptToken(encrypted)
  } catch {
    clearEncryptionKey()
    return null
  }
}

export function saveConfig(config: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEYS.GITHUB_CONFIG, JSON.stringify(config))
}

export function loadConfig<T>(): T | null {
  const raw = localStorage.getItem(STORAGE_KEYS.GITHUB_CONFIG)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
