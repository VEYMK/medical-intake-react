import { describe, expect, it } from 'vitest'
import {
  collectDraftValues,
  createInitialState,
  intakeReducer,
} from './intakeReducer'
import type { Patient } from '../types'

const patient: Patient = {
  id: 'p-1',
  reference: 'MF-2026-ABCDE',
  createdAt: '2026-11-10T10:00:00.000Z',
  lastName: 'Иванов',
  firstName: 'Иван',
  middleName: null,
  birthDate: '1990-05-20',
  gender: 'male',
  guardianName: null,
  guardianPhone: null,
  phone: '+7 (999) 123-45-67',
  email: 'ivanov@example.com',
  preferredContact: 'phone',
  address: null,
  hasInsurance: false,
  policyNumber: null,
  insurer: null,
  insurerOther: null,
  visitReason: 'consultation',
  preferredDate: '2026-11-20',
  symptoms: 'Болит голова и повышено давление последние три дня.',
}

describe('intakeReducer', () => {
  it('masks phone and policy values on change', () => {
    let state = createInitialState()
    state = intakeReducer(state, { type: 'change', name: 'phone', value: '9991234567' })
    expect(state.values.phone).toBe('+7 (999) 123-45-67')

    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'yes' })
    state = intakeReducer(state, {
      type: 'change',
      name: 'policyNumber',
      value: '1234567890123456',
    })
    expect(state.values.policyNumber).toBe('1234 5678 9012 3456')
  })

  it('clears insurance answers when the policy is removed', () => {
    let state = createInitialState()
    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'yes' })
    state = intakeReducer(state, { type: 'change', name: 'insurer', value: 'other' })
    state = intakeReducer(state, {
      type: 'change',
      name: 'insurerOther',
      value: 'Медстрах',
    })
    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'no' })

    expect(state.values.policyNumber).toBe('')
    expect(state.values.insurer).toBe('')
    expect(state.values.insurerOther).toBe('')
  })

  it('clears the other insurer name when a known insurer is picked', () => {
    let state = createInitialState()
    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'yes' })
    state = intakeReducer(state, { type: 'change', name: 'insurer', value: 'other' })
    state = intakeReducer(state, {
      type: 'change',
      name: 'insurerOther',
      value: 'Медстрах',
    })
    state = intakeReducer(state, { type: 'change', name: 'insurer', value: 'sogaz' })

    expect(state.values.insurerOther).toBe('')
  })

  it('shows guardian fields only for minors and clears them for adults', () => {
    let state = createInitialState()
    state = intakeReducer(state, {
      type: 'change',
      name: 'birthDate',
      value: '2015-01-01',
    })
    state = intakeReducer(state, {
      type: 'change',
      name: 'guardianName',
      value: 'Петрова Анна',
    })
    expect(state.values.guardianName).toBe('Петрова Анна')

    state = intakeReducer(state, {
      type: 'change',
      name: 'birthDate',
      value: '1990-01-01',
    })
    expect(state.values.guardianName).toBe('')
  })

  it('normalizes whitespace and validates on blur', () => {
    let state = createInitialState()
    state = intakeReducer(state, {
      type: 'change',
      name: 'lastName',
      value: '  Иванов   Иван ',
    })
    expect(state.errors.lastName).toBeUndefined()

    state = intakeReducer(state, { type: 'blur', name: 'lastName' })
    expect(state.values.lastName).toBe('Иванов Иван')
    expect(state.touched.lastName).toBe(true)
    expect(state.errors.lastName).toBeUndefined()

    state = intakeReducer(state, { type: 'change', name: 'firstName', value: 'И' })
    state = intakeReducer(state, { type: 'blur', name: 'firstName' })
    expect(state.errors.firstName).toMatch(/от 2 до 60/)
  })

  it('ignores a late blur on a field that reset has just cleared', () => {
    let state = createInitialState()
    state = intakeReducer(state, {
      type: 'change',
      name: 'birthDate',
      value: '2015-01-01',
    })
    state = intakeReducer(state, { type: 'blur', name: 'birthDate' })
    state = intakeReducer(state, { type: 'reset' })

    // The dialog restores focus to the previously focused control, so this
    // blur arrives after the reset with an empty, untouched field.
    state = intakeReducer(state, { type: 'blur', name: 'birthDate' })

    expect(state.values.birthDate).toBe('')
    expect(state.errors).toEqual({})
    expect(state.touched.birthDate).toBeUndefined()
  })

  it('still flags an empty field the user has already touched', () => {
    let state = createInitialState()
    state = intakeReducer(state, {
      type: 'change',
      name: 'firstName',
      value: 'Иван',
    })
    state = intakeReducer(state, { type: 'blur', name: 'firstName' })
    state = intakeReducer(state, { type: 'change', name: 'firstName', value: '' })
    state = intakeReducer(state, { type: 'blur', name: 'firstName' })

    expect(state.errors.firstName).toMatch(/Заполните/)
  })

  it('moves to success and error states on submit', () => {
    let state = intakeReducer(createInitialState(), { type: 'submit/start' })
    expect(state.status).toBe('submitting')

    state = intakeReducer(state, {
      type: 'submit/success',
      response: { ok: true, reference: 'MF-2026-ABCDE', patient },
    })
    expect(state.status).toBe('success')
    expect(state.reference).toBe('MF-2026-ABCDE')
    expect(state.savedPatient?.id).toBe('p-1')

    const failed = intakeReducer(createInitialState(), {
      type: 'submit/error',
      message: 'Сервер недоступен',
      fieldErrors: { email: 'Проверьте email.' },
    })
    expect(failed.status).toBe('error')
    expect(failed.submitError).toBe('Сервер недоступен')
    expect(failed.errors.email).toBe('Проверьте email.')
  })

  it('collects a draft without consent or empty values', () => {
    let state = createInitialState()
    state = intakeReducer(state, { type: 'change', name: 'lastName', value: 'Иванов' })
    state = intakeReducer(state, { type: 'change', name: 'consent', value: true })
    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'yes' })
    state = intakeReducer(state, {
      type: 'change',
      name: 'policyNumber',
      value: '1234567890123456',
    })
    state = intakeReducer(state, { type: 'change', name: 'hasInsurance', value: 'no' })

    const draft = collectDraftValues(state.values)
    expect(draft.lastName).toBe('Иванов')
    expect(draft.consent).toBeUndefined()
    expect(draft.policyNumber).toBeUndefined()
    expect(draft.email).toBeUndefined()
  })
})
