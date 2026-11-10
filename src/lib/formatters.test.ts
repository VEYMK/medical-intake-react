import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  calculateAge,
  caretAfterMask,
  formatPhone,
  formatPolicyNumber,
  isMinor,
  normalizePhone,
  parseIsoDate,
  todayIso,
} from './formatters'

describe('normalizePhone / formatPhone', () => {
  it('normalizes +7, 8 and bare numbers to the same 11 digits', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
    expect(normalizePhone('89991234567')).toBe('79991234567')
    expect(normalizePhone('9991234567')).toBe('79991234567')
    expect(normalizePhone('')).toBe('')
  })

  it('formats progressively while typing', () => {
    expect(formatPhone('9')).toBe('+7 (9')
    expect(formatPhone('999')).toBe('+7 (999)')
    expect(formatPhone('9991')).toBe('+7 (999) 1')
    expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67')
  })

  it('does not exceed 11 digits', () => {
    expect(formatPhone('999123456789999')).toBe('+7 (999) 123-45-67')
  })
})

describe('formatPolicyNumber', () => {
  it('groups 16 digits in fours and drops the rest', () => {
    expect(formatPolicyNumber('1234567890123456')).toBe('1234 5678 9012 3456')
    expect(formatPolicyNumber('12345678901234567890')).toBe('1234 5678 9012 3456')
    expect(formatPolicyNumber('1234')).toBe('1234')
  })
})

describe('dates', () => {
  it('rejects impossible calendar dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('2026-13-01')).toBeNull()
    expect(parseIsoDate('not-a-date')).toBeNull()
    expect(parseIsoDate('2026-02-28')).toBeInstanceOf(Date)
  })

  it('calculates age using local date parts', () => {
    const now = new Date(2026, 10, 10)
    expect(calculateAge('1990-05-20', now)).toBe(36)
    expect(calculateAge('2026-11-11', now)).toBeNull()
    expect(isMinor('2010-01-01', now)).toBe(true)
    expect(isMinor('2000-01-01', now)).toBe(false)
  })

  it('adds days across month boundaries', () => {
    expect(addDaysIso(90, new Date(2026, 10, 10))).toBe('2027-02-08')
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('caretAfterMask', () => {
  it('keeps the caret after the typed phone digit', () => {
    expect(caretAfterMask('9', 1, '+7 (9', true)).toBe(5)
    expect(caretAfterMask('999', 3, '+7 (999)', true)).toBe(7)
  })

  it('keeps the caret after a policy digit', () => {
    expect(caretAfterMask('12345', 5, '1234 5')).toBe(6)
  })
})
