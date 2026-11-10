import { describe, expect, it } from 'vitest'
import { DRAFT_KEY, DRAFT_TTL_MS, clearDraft, loadDraft, saveDraft } from './draft'

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

describe('draft store', () => {
  it('saves and restores values with a timestamp', () => {
    const storage = new MemoryStorage()
    const saved = saveDraft({ lastName: 'Иванов', consent: true }, storage, 1_000)

    expect(saved.ok).toBe(true)
    const loaded = loadDraft(storage, 2_000)
    expect(loaded.status).toBe('ok')
    if (loaded.status === 'ok') {
      expect(loaded.values.lastName).toBe('Иванов')
      expect(loaded.savedAt.getTime()).toBe(1_000)
    }
  })

  it('removes a draft older than the TTL', () => {
    const storage = new MemoryStorage()
    saveDraft({ lastName: 'Иванов' }, storage, 1_000)

    const loaded = loadDraft(storage, 1_000 + DRAFT_TTL_MS + 1)
    expect(loaded.status).toBe('expired')
    expect(storage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('removes corrupt JSON and unsupported versions', () => {
    const storage = new MemoryStorage()
    storage.setItem(DRAFT_KEY, '{not json')
    expect(loadDraft(storage, 1_000).status).toBe('corrupt')

    storage.setItem(DRAFT_KEY, JSON.stringify({ version: 99, values: {} }))
    expect(loadDraft(storage, 1_000).status).toBe('stale')
  })

  it('clears the draft', () => {
    const storage = new MemoryStorage()
    saveDraft({ firstName: 'Иван' }, storage, 1_000)
    expect(clearDraft(storage)).toBe(true)
    expect(loadDraft(storage, 2_000).status).toBe('empty')
  })
})
