import { ALL_FIELDS } from '../schema'
import type {
  ContactMethod,
  FieldErrors,
  FieldName,
  FormResponse,
  Gender,
  Insurer,
  Patient,
  PatientInput,
  VisitReason,
} from '../types'

/**
 * The API client is the only place that knows about HTTP.
 * Swapping Express for the Java backend later means changing this file only.
 */
const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

const GENDERS: readonly Gender[] = ['female', 'male', 'other', 'undisclosed']
const CONTACT_METHODS: readonly ContactMethod[] = ['phone', 'email', 'sms']
const INSURERS: readonly Insurer[] = ['sogaz', 'alfa', 'ingos', 'vsk', 'other']
const VISIT_REASONS: readonly VisitReason[] = [
  'consultation',
  'checkup',
  'followup',
  'tests',
  'other',
]

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

function parseFieldErrors(value: unknown): FieldErrors {
  if (!isObject(value)) return {}

  const known = new Set<string>(ALL_FIELDS.map((field) => field.name))
  const errors: FieldErrors = {}
  for (const [key, message] of Object.entries(value)) {
    if (known.has(key) && isString(message) && message !== '') {
      errors[key as FieldName] = message
    }
  }
  return errors
}

/** Narrows unknown JSON to a Patient without `any`. Returns null on a bad shape. */
export function parsePatient(value: unknown): Patient | null {
  if (!isObject(value)) return null
  if (
    !isString(value.id) ||
    !isString(value.reference) ||
    !isString(value.createdAt) ||
    !isString(value.lastName) ||
    !isString(value.firstName) ||
    !isNullableString(value.middleName) ||
    !isString(value.birthDate) ||
    !isOneOf(value.gender, GENDERS) ||
    !isNullableString(value.guardianName) ||
    !isNullableString(value.guardianPhone) ||
    !isString(value.phone) ||
    !isString(value.email) ||
    !isOneOf(value.preferredContact, CONTACT_METHODS) ||
    !isNullableString(value.address) ||
    typeof value.hasInsurance !== 'boolean' ||
    !isNullableString(value.policyNumber) ||
    !(value.insurer === null || isOneOf(value.insurer, INSURERS)) ||
    !isNullableString(value.insurerOther) ||
    !isOneOf(value.visitReason, VISIT_REASONS) ||
    !isString(value.preferredDate) ||
    !isString(value.symptoms)
  ) {
    return null
  }

  return {
    id: value.id,
    reference: value.reference,
    createdAt: value.createdAt,
    lastName: value.lastName,
    firstName: value.firstName,
    middleName: value.middleName,
    birthDate: value.birthDate,
    gender: value.gender,
    guardianName: value.guardianName,
    guardianPhone: value.guardianPhone,
    phone: value.phone,
    email: value.email,
    preferredContact: value.preferredContact,
    address: value.address,
    hasInsurance: value.hasInsurance,
    policyNumber: value.policyNumber,
    insurer: value.insurer,
    insurerOther: value.insurerOther,
    visitReason: value.visitReason,
    preferredDate: value.preferredDate,
    symptoms: value.symptoms,
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(
      'Не удалось связаться с сервером. Проверьте, что API запущен, и повторите попытку.',
      0,
    )
  }

  const text = await response.text()
  let data: unknown = null
  if (text !== '') {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError('Сервер вернул ответ не в формате JSON.', response.status)
    }
  }

  if (!response.ok) {
    const body = isObject(data) ? data : {}
    const message = isString(body.message)
      ? body.message
      : `Запрос завершился с ошибкой ${response.status}.`
    throw new ApiError(message, response.status, parseFieldErrors(body.fieldErrors))
  }

  return data
}

export async function fetchPatients(): Promise<Patient[]> {
  const data = await request('/patients')
  if (!isObject(data) || !Array.isArray(data.patients)) {
    throw new ApiError('Сервер вернул неожиданный список пациентов.', 200)
  }

  const patients: Patient[] = []
  for (const item of data.patients) {
    const patient = parsePatient(item)
    if (!patient) {
      throw new ApiError('В ответе сервера не хватает данных пациента.', 200)
    }
    patients.push(patient)
  }
  return patients
}

export async function createPatient(input: PatientInput): Promise<FormResponse> {
  const data = await request('/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!isObject(data) || !isString(data.reference)) {
    throw new ApiError('Сервер не вернул номер заявки.', 201)
  }

  const patient = parsePatient(data.patient)
  if (!patient) {
    throw new ApiError('Сервер вернул неожиданные данные пациента.', 201)
  }

  return { ok: true, reference: data.reference, patient }
}
