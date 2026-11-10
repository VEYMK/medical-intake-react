import type { FieldName, FieldValue } from '../types'

export const DRAFT_KEY = 'med-intake-react:draft'
export const DRAFT_VERSION = 1
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type DraftValues = Partial<Record<FieldName, FieldValue>>

export type DraftLoadResult =
  | { status: 'ok'; values: DraftValues; savedAt: Date }
  | { status: 'empty' | 'unavailable' | 'corrupt' | 'stale' | 'expired' }

/**
 * localStorage can throw on access (private mode, disabled cookies, sandboxed
 * iframe). Probe it once and degrade gracefully instead of crashing the form.
 */
export function getSafeStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    if (!storage) return null
    const probe = '__med_intake_react_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function removeDraft(storage: Storage): void {
  try {
    storage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore: storage is unavailable or read-only.
  }
}

export function loadDraft(
  storage: Storage | null = getSafeStorage(),
  now: number = Date.now(),
): DraftLoadResult {
  if (!storage) return { status: 'unavailable' }

  let raw: string | null
  try {
    raw = storage.getItem(DRAFT_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (!raw) return { status: 'empty' }

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    removeDraft(storage)
    return { status: 'corrupt' }
  }

  if (!isPlainObject(data) || data.version !== DRAFT_VERSION) {
    removeDraft(storage)
    return { status: 'stale' }
  }

  const savedAtMs = typeof data.savedAt === 'string' ? Date.parse(data.savedAt) : Number.NaN
  if (
    !Number.isFinite(savedAtMs) ||
    now - savedAtMs > DRAFT_TTL_MS ||
    savedAtMs > now + 60_000
  ) {
    removeDraft(storage)
    return { status: 'expired' }
  }

  if (!isPlainObject(data.values)) {
    removeDraft(storage)
    return { status: 'corrupt' }
  }

  const values: DraftValues = {}
  for (const [key, value] of Object.entries(data.values)) {
    if (typeof value === 'string' || typeof value === 'boolean') {
      values[key as FieldName] = value
    }
  }

  return { status: 'ok', values, savedAt: new Date(savedAtMs) }
}

export type SaveDraftResult =
  | { ok: true; savedAt: Date }
  | { ok: false; reason: 'unavailable' | 'quota' | 'error' }

export function saveDraft(
  values: DraftValues,
  storage: Storage | null = getSafeStorage(),
  now: number = Date.now(),
): SaveDraftResult {
  if (!storage) return { ok: false, reason: 'unavailable' }
  const savedAt = new Date(now)
  try {
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({ version: DRAFT_VERSION, savedAt: savedAt.toISOString(), values }),
    )
    return { ok: true, savedAt }
  } catch (error) {
    const reason =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
        ? 'quota'
        : 'error'
    return { ok: false, reason }
  }
}

export function clearDraft(storage: Storage | null = getSafeStorage()): boolean {
  if (!storage) return false
  try {
    storage.removeItem(DRAFT_KEY)
    return true
  } catch {
    return false
  }
}
