/**
 * Shared domain types.
 *
 * The same shapes are used by the form, the API client and the Express server
 * contract. No `any`: unknown JSON is narrowed at the boundary in `api/patients.ts`.
 */

export type Gender = 'female' | 'male' | 'other' | 'undisclosed'
export type ContactMethod = 'phone' | 'email' | 'sms'
export type YesNo = 'yes' | 'no'
export type Insurer = 'sogaz' | 'alfa' | 'ingos' | 'vsk' | 'other'
export type VisitReason =
  | 'consultation'
  | 'checkup'
  | 'followup'
  | 'tests'
  | 'other'

/** A single form control value. Checkboxes are boolean, everything else is text. */
export type FieldValue = string | boolean

export interface FormValues {
  lastName: string
  firstName: string
  middleName: string
  birthDate: string
  gender: Gender | ''
  guardianName: string
  guardianPhone: string
  phone: string
  email: string
  preferredContact: ContactMethod | ''
  address: string
  hasInsurance: YesNo | ''
  policyNumber: string
  insurer: Insurer | ''
  insurerOther: string
  visitReason: VisitReason | ''
  preferredDate: string
  symptoms: string
  consent: boolean
}

export type FieldName = keyof FormValues

/** Field-level validation messages keyed by field name. */
export type FieldErrors = Partial<Record<FieldName, string>>

/**
 * A patient as returned by `GET /api/patients` and `POST /api/patients`.
 * Optional answers are `null` on the server instead of missing keys.
 */
export interface Patient {
  id: string
  reference: string
  createdAt: string
  lastName: string
  firstName: string
  middleName: string | null
  birthDate: string
  gender: Gender
  guardianName: string | null
  guardianPhone: string | null
  phone: string
  email: string
  preferredContact: ContactMethod
  address: string | null
  hasInsurance: boolean
  policyNumber: string | null
  insurer: Insurer | null
  insurerOther: string | null
  visitReason: VisitReason
  preferredDate: string
  symptoms: string
}

/**
 * Payload accepted by `POST /api/patients`.
 * Consent is part of the request contract but is not stored on the patient card.
 */
export type PatientInput = Omit<Patient, 'id' | 'reference' | 'createdAt'> & {
  consent: true
}

export interface PatientsResponse {
  ok: true
  patients: Patient[]
}

export interface FormResponse {
  ok: true
  reference: string
  patient: Patient
}

export interface ApiErrorBody {
  ok: false
  message: string
  fieldErrors?: FieldErrors
}

/** Result of the form submission state machine. */
export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'
