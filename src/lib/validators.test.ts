import { describe, expect, it } from 'vitest'
import { createEmptyValues } from '../schema'
import type { FormValues } from '../types'
import {
  getProgress,
  validateAll,
  validateEmail,
  validateField,
  validateName,
  validatePhone,
  validatePreferredDate,
  validateSymptoms,
} from './validators'
import { getField } from '../schema'

const TODAY = '2026-11-10'

function values(overrides: Partial<FormValues> = {}): FormValues {
  return { ...createEmptyValues(), ...overrides }
}

function validAdult(overrides: Partial<FormValues> = {}): FormValues {
  return values({
    lastName: 'Иванов',
    firstName: 'Иван',
    birthDate: '1990-05-20',
    gender: 'male',
    phone: '+7 (999) 123-45-67',
    email: 'ivanov@example.com',
    preferredContact: 'phone',
    hasInsurance: 'no',
    visitReason: 'consultation',
    preferredDate: '2026-11-20',
    symptoms: 'Болит голова и повышено давление последние три дня.',
    consent: true,
    ...overrides,
  })
}

describe('field validators', () => {
  it('accepts a normal email and rejects broken ones', () => {
    expect(validateEmail('name+tag@example.com')).toBeNull()
    expect(validateEmail('имя@пример.рф')).toBeNull()
    expect(validateEmail('bad@')).toMatch(/name@example\.com/)
    expect(validateEmail('a..b@example.com')).toMatch(/name@example\.com/)
    expect(validateEmail('name@example')).toMatch(/name@example\.com/)
    expect(validateEmail('name @example.com')).toMatch(/пробелы/)
  })

  it('validates names, phones and symptom length', () => {
    expect(validateName('  Иванов  ')).toBeNull()
    expect(validateName('И')).toMatch(/от 2 до 60/)
    expect(validateName('Ivanov123')).toMatch(/только буквы/)
    expect(validatePhone('+7 (999) 123-45-67')).toBeNull()
    expect(validatePhone('+7 (999) 123-45')).toMatch(/полностью/)
    expect(validateSymptoms('коротко')).toMatch(/минимум 10/)
  })

  it('rejects past and far-future appointment dates', () => {
    expect(validatePreferredDate('2026-11-10', TODAY)).toBeNull()
    expect(validatePreferredDate('2026-11-09', TODAY)).toMatch(/сегодняшнюю/)
    expect(validatePreferredDate('2027-03-01', TODAY)).toMatch(/90 дней/)
  })

  it('validates conditionally: a minor needs a guardian', () => {
    const field = getField('guardianName')
    expect(field).toBeDefined()
    if (!field) return

    const minor = values({ birthDate: '2015-01-01' })
    expect(validateField(field, '', minor, { today: TODAY })).toMatch(/Заполните/)
    expect(validateField(field, '', values({ birthDate: '1990-01-01' }), { today: TODAY })).toBeNull()
  })
})

describe('validateAll', () => {
  it('returns exactly the 12 visible required fields for an empty form', () => {
    const errors = validateAll(values(), { today: TODAY })
    expect(Object.keys(errors)).toHaveLength(12)
    expect(errors.guardianName).toBeUndefined()
    expect(errors.policyNumber).toBeUndefined()
    expect(errors.consent).toMatch(/согласие/)
  })

  it('accepts a complete adult form without insurance', () => {
    expect(validateAll(validAdult(), { today: TODAY })).toEqual({})
  })

  it('requires policy and insurer when insurance is selected', () => {
    const errors = validateAll(validAdult({ hasInsurance: 'yes' }), { today: TODAY })
    expect(errors.policyNumber).toMatch(/Заполните/)
    expect(errors.insurer).toMatch(/списка/)
  })

  it('requires the other insurer name only for the "other" option', () => {
    const withOther = validateAll(
      validAdult({
        hasInsurance: 'yes',
        policyNumber: '1234 5678 9012 3456',
        insurer: 'other',
      }),
      { today: TODAY },
    )
    expect(withOther.insurerOther).toMatch(/Заполните/)

    const withKnown = validateAll(
      validAdult({
        hasInsurance: 'yes',
        policyNumber: '1234 5678 9012 3456',
        insurer: 'sogaz',
      }),
      { today: TODAY },
    )
    expect(withKnown.insurerOther).toBeUndefined()
  })
})

describe('getProgress', () => {
  it('counts only visible required fields', () => {
    expect(getProgress(values())).toEqual({ filled: 0, total: 12 })
    expect(
      getProgress(values({ lastName: 'Иванов', consent: true })).filled,
    ).toBe(2)
    expect(getProgress(validAdult()).filled).toBe(12)
  })
})
