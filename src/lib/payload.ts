import {
  formatPhone,
  formatPolicyNumber,
  normalizeWhitespace,
  onlyDigits,
} from './formatters'
import type {
  ContactMethod,
  Gender,
  Insurer,
  PatientInput,
  FormValues,
  VisitReason,
} from '../types'

function requiredOption<T extends string>(value: T | '', field: string): T {
  if (value === '') {
    throw new Error(`Cannot build a patient without a value for "${field}"`)
  }
  return value
}

function nullable(value: string): string | null {
  const text = value.trim()
  return text === '' ? null : text
}

/** Normalizes form strings and converts them to the API contract. */
export function toPatientInput(values: FormValues): PatientInput {
  const hasInsurance = values.hasInsurance === 'yes'
  const gender: Gender = requiredOption(values.gender, 'gender')
  const preferredContact: ContactMethod = requiredOption(
    values.preferredContact,
    'preferredContact',
  )
  const visitReason: VisitReason = requiredOption(values.visitReason, 'visitReason')

  return {
    lastName: normalizeWhitespace(values.lastName),
    firstName: normalizeWhitespace(values.firstName),
    middleName: nullable(normalizeWhitespace(values.middleName)),
    birthDate: values.birthDate,
    gender,
    guardianName: nullable(normalizeWhitespace(values.guardianName)),
    guardianPhone: nullable(
      values.guardianPhone === '' ? '' : formatPhone(values.guardianPhone),
    ),
    phone: formatPhone(values.phone),
    email: values.email.trim(),
    preferredContact,
    address: nullable(normalizeWhitespace(values.address)),
    hasInsurance,
    policyNumber: hasInsurance ? formatPolicyNumber(values.policyNumber) : null,
    insurer: hasInsurance
      ? requiredOption<Insurer>(values.insurer, 'insurer')
      : null,
    insurerOther:
      hasInsurance && values.insurer === 'other'
        ? nullable(normalizeWhitespace(values.insurerOther))
        : null,
    visitReason,
    preferredDate: values.preferredDate,
    symptoms: normalizeWhitespace(values.symptoms),
    consent: true,
  }
}

/** A short human-readable policy number for the patient card. */
export function maskPolicyNumber(value: string | null): string {
  if (!value) return '—'
  const digits = onlyDigits(value)
  if (digits.length < 4) return '—'
  return `•••• ${digits.slice(-4)}`
}
