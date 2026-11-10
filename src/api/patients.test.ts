import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createPatient, fetchPatients, parsePatient } from './patients'
import type { Patient, PatientInput } from '../types'

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

const input: PatientInput = {
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
  consent: true,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parsePatient', () => {
  it('narrows a valid API object to Patient', () => {
    expect(parsePatient(patient)).toEqual(patient)
  })

  it('rejects objects with missing or invalid fields', () => {
    expect(parsePatient({ ...patient, gender: 'unknown' })).toBeNull()
    expect(parsePatient({ ...patient, phone: undefined })).toBeNull()
    expect(parsePatient(null)).toBeNull()
    expect(parsePatient([])).toBeNull()
  })
})

describe('fetchPatients', () => {
  it('returns typed patients', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true, patients: [patient] })))

    await expect(fetchPatients()).resolves.toEqual([patient])
  })

  it('throws ApiError for a bad payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true, patients: [{}] })))

    await expect(fetchPatients()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createPatient', () => {
  it('returns the created patient and reference', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ ok: true, reference: 'MF-2026-ABCDE', patient }, 201)),
    )

    const response = await createPatient(input)
    expect(response.reference).toBe('MF-2026-ABCDE')
    expect(response.patient.id).toBe('p-1')
  })

  it('maps 422 field errors to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            ok: false,
            message: 'Проверьте поля анкеты.',
            fieldErrors: { email: 'Проверьте email.' },
          },
          422,
        ),
      ),
    )

    const error = await createPatient(input).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    if (error instanceof ApiError) {
      expect(error.status).toBe(422)
      expect(error.fieldErrors.email).toBe('Проверьте email.')
    }
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const error = await createPatient(input).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    if (error instanceof ApiError) {
      expect(error.status).toBe(0)
      expect(error.message).toMatch(/сервером/)
    }
  })
})
