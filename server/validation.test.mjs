import { describe, expect, it } from 'vitest'
import { validatePatientInput } from './validation.mjs'

const TODAY = '2026-11-10'

function payload(overrides = {}) {
  return {
    lastName: 'Иванов',
    firstName: 'Иван',
    middleName: '',
    birthDate: '1990-05-20',
    gender: 'male',
    guardianName: '',
    guardianPhone: '',
    phone: '89991234567',
    email: 'ivanov@example.com',
    preferredContact: 'phone',
    address: '',
    hasInsurance: false,
    policyNumber: '',
    insurer: '',
    insurerOther: '',
    visitReason: 'consultation',
    preferredDate: '2026-11-20',
    symptoms: 'Болит голова и повышено давление последние три дня.',
    consent: true,
    ...overrides,
  }
}

function run(overrides = {}) {
  return validatePatientInput(payload(overrides), { today: TODAY })
}

describe('validatePatientInput', () => {
  it('accepts a complete adult form and normalizes values', () => {
    const result = run()
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.patient.phone).toBe('+7 (999) 123-45-67')
    expect(result.patient.middleName).toBeNull()
    expect(result.patient.address).toBeNull()
    expect(result.patient.policyNumber).toBeNull()
    expect(result.patient.guardianName).toBeNull()
  })

  it('rejects a non-object body', () => {
    const result = validatePatientInput(null, { today: TODAY })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/JSON/)
  })

  it('rejects an empty form with field-level errors', () => {
    const result = validatePatientInput({}, { today: TODAY })
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(Object.keys(result.fieldErrors).length).toBeGreaterThanOrEqual(10)
    expect(result.fieldErrors.lastName).toBeDefined()
    expect(result.fieldErrors.email).toBeDefined()
    expect(result.fieldErrors.consent).toMatch(/согласие/)
    expect(result.fieldErrors.guardianName).toBeUndefined()
  })

  it('never trusts a client that claims consent without sending it', () => {
    const result = run({ consent: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors.consent).toBeDefined()
  })

  it('requires a guardian for a minor patient', () => {
    const result = run({ birthDate: '2015-01-01' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors.guardianName).toMatch(/2 до 60/)
    expect(result.fieldErrors.guardianPhone).toMatch(/полностью/)
  })

  it('requires policy and insurer when insurance is selected', () => {
    const result = run({ hasInsurance: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors.policyNumber).toMatch(/16 цифр/)
    expect(result.fieldErrors.insurer).toMatch(/списка/)
  })

  it('requires the other insurer name only for "other"', () => {
    const other = run({
      hasInsurance: true,
      policyNumber: '1234567890123456',
      insurer: 'other',
    })
    expect(other.ok).toBe(false)
    if (!other.ok) expect(other.fieldErrors.insurerOther).toMatch(/название/)

    const known = run({
      hasInsurance: true,
      policyNumber: '1234567890123456',
      insurer: 'sogaz',
    })
    expect(known.ok).toBe(true)
    if (known.ok) expect(known.patient.policyNumber).toBe('1234 5678 9012 3456')
  })

  it('rejects invalid enums, future birth dates and out-of-range visits', () => {
    const result = run({
      gender: 'unknown',
      preferredContact: 'telepathy',
      visitReason: 'party',
      birthDate: '2027-01-01',
      preferredDate: '2027-06-01',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.fieldErrors.gender).toBeDefined()
    expect(result.fieldErrors.preferredContact).toBeDefined()
    expect(result.fieldErrors.visitReason).toBeDefined()
    expect(result.fieldErrors.birthDate).toMatch(/будущем/)
    expect(result.fieldErrors.preferredDate).toMatch(/90 дней/)
  })

  it('rejects an invalid email and a short symptom description', () => {
    const result = run({ email: 'bad@', symptoms: 'болит' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors.email).toMatch(/name@example\.com/)
    expect(result.fieldErrors.symptoms).toMatch(/минимум 10/)
  })
})
