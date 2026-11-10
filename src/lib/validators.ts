import {
  addDaysIso,
  calculateAge,
  compareIsoDates,
  normalizePhone,
  normalizeWhitespace,
  onlyDigits,
  parseIsoDate,
  todayIso,
} from './formatters'
import { ALL_FIELDS, isRequired, isVisible } from '../schema'
import type { FormFieldSchema } from '../schema'
import type { FieldErrors, FieldValue, FormValues } from '../types'

export function isBlank(value: FieldValue | null | undefined): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'boolean') return !value
  return value.trim() === ''
}

function requiredMessage(field: FormFieldSchema): string {
  if (field.validation === 'consent' || field.type === 'checkbox') {
    return 'Подтвердите согласие, чтобы продолжить.'
  }
  if (field.type === 'radio') {
    return 'Выберите один из вариантов.'
  }
  if (field.type === 'select') {
    return 'Выберите значение из списка.'
  }
  return 'Заполните это поле.'
}

/**
 * A practical client-side email check. Intentionally stricter than
 * "something@something" but still allows plus-addressing and Unicode letters.
 * The server validates independently; this is UX only.
 */
export function validateEmail(value: unknown): string | null {
  const email = String(value ?? '').trim()
  if (email.length > 254) return 'Email слишком длинный (максимум 254 символа).'
  if (/\s/.test(email)) return 'Email не должен содержать пробелы.'

  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) {
    return 'Введите email в формате name@example.com.'
  }

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)

  if (local.length > 64) return 'Часть email до @ слишком длинная.'
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return 'Введите email в формате name@example.com.'
  }
  if (!/^[^\s@]+$/.test(local)) {
    return 'Введите email в формате name@example.com.'
  }

  if (domain.length > 253 || !domain.includes('.')) {
    return 'Введите email в формате name@example.com.'
  }

  const labels = domain.split('.')
  for (const label of labels) {
    if (
      !label ||
      label.length > 63 ||
      label.startsWith('-') ||
      label.endsWith('-') ||
      !/^[\p{L}\p{N}-]+$/u.test(label)
    ) {
      return 'Проверьте домен в адресе email.'
    }
  }

  const topLevelDomain = labels[labels.length - 1] ?? ''
  if (!/^\p{L}{2,}$/u.test(topLevelDomain)) {
    return 'Проверьте домен в адресе email.'
  }

  return null
}

export function validateName(value: unknown): string | null {
  const name = normalizeWhitespace(value)
  if (name.length < 2 || name.length > 60) {
    return 'Введите значение длиной от 2 до 60 символов.'
  }
  if (!/^\p{L}+(?:[ '\-’]\p{L}+)*$/u.test(name)) {
    return 'Используйте только буквы, пробел, дефис или апостроф.'
  }
  return null
}

export function validatePhone(value: unknown): string | null {
  const digits = normalizePhone(value)
  if (digits.length !== 11) {
    return 'Введите номер полностью: +7 (999) 123-45-67.'
  }
  return null
}

export function validateBirthDate(value: unknown, today = todayIso()): string | null {
  const date = parseIsoDate(value)
  if (!date) return 'Укажите корректную дату рождения.'
  if (compareIsoDates(String(value), today) > 0) {
    return 'Дата рождения не может быть в будущем.'
  }
  if (compareIsoDates(String(value), '1900-01-01') < 0) {
    return 'Проверьте дату рождения.'
  }
  const age = calculateAge(String(value), parseIsoDate(today) ?? new Date())
  if (age === null || age > 120) {
    return 'Проверьте дату рождения.'
  }
  return null
}

export function validatePreferredDate(value: unknown, today = todayIso()): string | null {
  const date = parseIsoDate(value)
  if (!date) return 'Укажите корректную дату приёма.'
  if (compareIsoDates(String(value), today) < 0) {
    return 'Выберите сегодняшнюю или будущую дату.'
  }
  const maxDate = addDaysIso(90, parseIsoDate(today) ?? new Date())
  if (compareIsoDates(String(value), maxDate) > 0) {
    return 'Дата должна быть в пределах ближайших 90 дней.'
  }
  return null
}

export function validatePolicyNumber(value: unknown): string | null {
  if (onlyDigits(value).length !== 16) {
    return 'Номер полиса ОМС состоит из 16 цифр.'
  }
  return null
}

export function validateSymptoms(value: unknown, maxLength = 1000): string | null {
  const text = normalizeWhitespace(value)
  if (text.length < 10) {
    return 'Опишите причину визита подробнее (минимум 10 символов).'
  }
  if (text.length > maxLength) {
    return `Не более ${maxLength} символов.`
  }
  return null
}

export function validateCompany(value: unknown): string | null {
  const text = normalizeWhitespace(value)
  if (text.length < 2) {
    return 'Укажите название страховой компании.'
  }
  if (text.length > 100) {
    return 'Название компании слишком длинное.'
  }
  return null
}

export function validateAddress(value: unknown, maxLength = 300): string | null {
  const text = normalizeWhitespace(value)
  if (text.length > maxLength) {
    return `Не более ${maxLength} символов.`
  }
  return null
}

/**
 * Central field validator. `values` is needed because some fields are required
 * only under certain conditions (minor patient, insurance = yes, etc.).
 */
export function validateField(
  field: FormFieldSchema,
  value: FieldValue,
  values: FormValues,
  options: { today?: string } = {},
): string | null {
  if (!isVisible(field, values)) return null

  const required = isRequired(field, values)
  const today = options.today ?? todayIso()

  if (field.validation === 'consent') {
    if (required && value !== true) {
      return 'Подтвердите согласие, чтобы продолжить.'
    }
    return null
  }

  if (isBlank(value)) {
    return required ? requiredMessage(field) : null
  }

  const text = String(value).trim()
  switch (field.validation) {
    case 'name':
      return validateName(text)
    case 'email':
      return validateEmail(text)
    case 'phone':
      return validatePhone(text)
    case 'birthDate':
      return validateBirthDate(text, today)
    case 'preferredDate':
      return validatePreferredDate(text, today)
    case 'policyNumber':
      return validatePolicyNumber(text)
    case 'symptoms':
      return validateSymptoms(text, field.maxLength ?? 1000)
    case 'company':
      return validateCompany(text)
    case 'address':
      return validateAddress(text, field.maxLength ?? 300)
    default:
      return null
  }
}

/** Validates every visible field. Returns a map so the summary can link to them. */
export function validateAll(
  values: FormValues,
  options: { today?: string } = {},
): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of ALL_FIELDS) {
    if (!isVisible(field, values)) continue
    const message = validateField(field, values[field.name], values, options)
    if (message) errors[field.name] = message
  }

  return errors
}

/** Counts visible required fields and how many of them are filled. */
export function getProgress(values: FormValues): { filled: number; total: number } {
  const required = ALL_FIELDS.filter(
    (field) => isVisible(field, values) && isRequired(field, values),
  )
  const filled = required.filter((field) => !isBlank(values[field.name])).length
  return { filled, total: required.length }
}
