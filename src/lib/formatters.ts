/**
 * Pure formatting and date helpers (ported from the vanilla JS project).
 * No DOM APIs, so they are easy to unit-test.
 */

export function normalizeWhitespace(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Normalizes a Russian phone number to 11 digits starting with 7.
 * Accepts +7..., 8..., 9991234567 and numbers with spaces/brackets/dashes.
 */
export function normalizePhone(value: unknown): string {
  let digits = onlyDigits(value)
  if (!digits) return ''
  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (!digits.startsWith('7')) {
    digits = `7${digits}`
  }
  return digits.slice(0, 11)
}

/** Formats a phone number progressively while the user types: +7 (999) 123-45-67 */
export function formatPhone(value: unknown): string {
  const digits = normalizePhone(value)
  if (!digits) return ''

  const rest = digits.slice(1)
  let result = '+7'
  if (rest.length > 0) result += ` (${rest.slice(0, 3)}`
  if (rest.length >= 3) result += ')'
  if (rest.length > 3) result += ` ${rest.slice(3, 6)}`
  if (rest.length > 6) result += `-${rest.slice(6, 8)}`
  if (rest.length > 8) result += `-${rest.slice(8, 10)}`
  return result
}

/** Formats a 16-digit OMS policy number in groups of four digits. */
export function formatPolicyNumber(value: unknown): string {
  const digits = onlyDigits(value).slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Returns a local (not UTC) ISO date string: YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now)
}

export function addDaysIso(days: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/**
 * Parses YYYY-MM-DD as a local date and rejects impossible dates
 * (for example 2026-02-30). The Date constructor would silently roll those over.
 */
export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** Lexicographic comparison works because both values are YYYY-MM-DD. */
export function compareIsoDates(left: string, right: string): -1 | 0 | 1 {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Full years between birthDate and now. Returns null for invalid or future dates. */
export function calculateAge(birthDate: string, now: Date = new Date()): number | null {
  const birth = parseIsoDate(birthDate)
  if (!birth) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (birth > today) return null

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export function isMinor(birthDate: string, now: Date = new Date()): boolean {
  const age = calculateAge(birthDate, now)
  return age !== null && age < 18
}

export function formatDateTimeRu(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function formatTimeRu(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateRu(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(date)
}

/**
 * Places the caret after the same number of significant digits after masking.
 * For phones the country code (7) is skipped, so typing "9" in an empty field
 * keeps the caret after the 9 instead of after the 7.
 */
export function caretAfterMask(
  oldValue: string,
  caret: number,
  formatted: string,
  skipCountryCode = false,
): number {
  const digitsBefore = onlyDigits(oldValue.slice(0, caret)).length
  const oldDigits = onlyDigits(oldValue)
  const hadCountryCode = skipCountryCode && /^[78]/.test(oldDigits)
  const significantBefore = Math.max(0, digitsBefore - (hadCountryCode ? 1 : 0))

  const formattedDigits = onlyDigits(formatted)
  if (significantBefore === 0) {
    return skipCountryCode && formatted.startsWith('+7') ? 2 : 0
  }

  const target = Math.min(formattedDigits.length, (skipCountryCode ? 1 : 0) + significantBefore)
  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    const char = formatted[index]
    if (char !== undefined && /\d/.test(char)) {
      seen += 1
      if (seen === target) return index + 1
    }
  }
  return formatted.length
}

/** Formats a stored ISO date as DD.MM.YYYY for compact summaries. */
export function formatShortDateRu(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
