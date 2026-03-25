/**
 * Server-side in-memory config store for:
 *  - Multiple v0 API keys (round-robin pool with error tracking)
 *  - SOCKS5 proxy URL
 *  - v0 model/mode selection
 *
 * Keys are stored in-process. In production you'd persist to a DB;
 * for this proxy use-case in-memory is sufficient between restarts.
 */

export type V0ModelMode = "pro" | "max" | "max-fast" | "fast"

export interface ApiKeyEntry {
  key: string
  label: string
  /** Error count. When >= DISABLE_THRESHOLD the key is skipped. */
  errorCount: number
  /** Timestamp when the key was last marked as quota-exceeded */
  quotaExceededAt?: number
  enabled: boolean
}

export interface ProxyConfig {
  enabled: boolean
  /** socks5://user:pass@host:port */
  url: string
}

export interface AccessKeyEntry {
  key: string
  label: string
  enabled: boolean
  createdAt: number
}

export interface AppConfig {
  keys: ApiKeyEntry[]
  accessKeys: AccessKeyEntry[]
  proxy: ProxyConfig
  modelMode: V0ModelMode
}

// How many consecutive errors before a key is temporarily disabled
const DISABLE_THRESHOLD = 3
// How long a quota-exceeded key stays disabled (ms) — 1 hour
const QUOTA_COOLDOWN_MS = 60 * 60 * 1000

// ---------- Singleton ----------
declare global {
  // eslint-disable-next-line no-var
  var __appConfig: AppConfig | undefined
}

function defaultConfig(): AppConfig {
  return {
    keys: [],
    accessKeys: [],
    proxy: { enabled: false, url: "" },
    modelMode: "pro",
  }
}

function getStore(): AppConfig {
  if (!global.__appConfig) {
    global.__appConfig = defaultConfig()
  }
  return global.__appConfig
}

// ---------- Public API ----------

export function getConfig(): AppConfig {
  return structuredClone(getStore())
}

export function saveConfig(patch: Partial<AppConfig>) {
  const store = getStore()
  if (patch.keys !== undefined) store.keys = patch.keys
  if (patch.accessKeys !== undefined) store.accessKeys = patch.accessKeys
  if (patch.proxy !== undefined) store.proxy = patch.proxy
  if (patch.modelMode !== undefined) store.modelMode = patch.modelMode
}

/**
 * Verify a request's Bearer token against the access key list.
 * Returns true if:
 *  - No access keys are configured (open mode), OR
 *  - The token matches an enabled access key.
 */
export function verifyAccessKey(token: string): boolean {
  const store = getStore()
  if (store.accessKeys.length === 0) return true
  return store.accessKeys.some((k) => k.enabled && k.key === token)
}

/**
 * Pick the next available API key using round-robin.
 * Keys with too many errors or recently quota-exceeded are skipped.
 * Returns null if all keys are exhausted.
 */
let rrIndex = 0

export function pickApiKey(): ApiKeyEntry | null {
  const store = getStore()
  const now = Date.now()
  const available = store.keys.filter((k) => {
    if (!k.enabled) return false
    if (k.errorCount >= DISABLE_THRESHOLD) {
      // Auto-recover after cooldown
      if (k.quotaExceededAt && now - k.quotaExceededAt > QUOTA_COOLDOWN_MS) {
        k.errorCount = 0
        k.quotaExceededAt = undefined
      } else {
        return false
      }
    }
    return true
  })
  if (available.length === 0) return null
  const idx = rrIndex % available.length
  rrIndex = (rrIndex + 1) % available.length
  return available[idx]
}

/**
 * Report a quota/rate-limit error for a key so it gets demoted.
 */
export function reportKeyError(key: string) {
  const store = getStore()
  const entry = store.keys.find((k) => k.key === key)
  if (!entry) return
  entry.errorCount += 1
  if (entry.errorCount >= DISABLE_THRESHOLD) {
    entry.quotaExceededAt = Date.now()
  }
}

/**
 * Report a successful call to reset a key's error count.
 */
export function reportKeySuccess(key: string) {
  const store = getStore()
  const entry = store.keys.find((k) => k.key === key)
  if (!entry) return
  entry.errorCount = 0
  entry.quotaExceededAt = undefined
}
