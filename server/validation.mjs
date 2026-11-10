/**
 * Server-side validation mirrors the client rules but never trusts the client.
 * Returns either normalized patient input or a map of field errors.
 */

const GENDERS = new Set(['female', 'male', 'other', 'undisclosed'])
const CONTACT_METHODS = new Set(['phone', 'email', 'sms'])
const INSURERS = new Set(['sogaz', 'alfa', 'ingos', 'vsk', 'other'])
const VISIT_REASONS = new Set(['consultation', 'checkup', 'followup', 'tests', 'other'])
const NAME_PATTERN = /^\p{L}+(?:[ '\-’]\p{L}+)*$/u

function normalizeWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function normalizePhone(value) {
  let digits = onlyDigits(value)
  if (!digits) return ''
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  else if (!digits.startsWith('7')) digits = `7${digits}`
  return digits.slice(0, 11)
}

function formatPhone(value) {
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

function formatPolicyNumber(value) {
  return onlyDigits(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}

function parseIsoDate(value) {
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

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayIso(now = new Date()) {
  return toIsoDate(now)
}

function addDaysIso(days, from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function calculateAge(birthDate, now = new Date()) {
  const birth = parseIsoDate(birthDate)
  if (!birth) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (birth > today) return null
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function isMinor(birthDate, now = new Date()) {
  const age = calculateAge(birthDate, now)
  return age !== null && age < 18
}

function validateEmail(value) {
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
  if (!/^[^\s@]+$/.test(local)) return 'Введите email в формате name@example.com.'
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

  if (!/^\p{L}{2,}$/u.test(labels[labels.length - 1] ?? '')) {
    return 'Проверьте домен в адресе email.'
  }
  return null
}

function validateName(value) {
  const name = normalizeWhitespace(value)
  if (name.length < 2 || name.length > 60) {
    return 'Введите значение длиной от 2 до 60 символов.'
  }
  if (!NAME_PATTERN.test(name)) {
    return 'Используйте только буквы, пробел, дефис или апостроф.'
  }
  return null
}

function readString(body, key) {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function readBoolean(body, key) {
  const value = body[key]
  return value === true || value === 'yes' || value === 'true'
}

export function validatePatientInput(body, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      message: 'Ожидается JSON-объект с данными анкеты.',
      fieldErrors: {},
    }
  }

  const today = options.today ?? todayIso()
  const fieldErrors = {}
  const fail = (name, message) => {
    fieldErrors[name] = message
  }

  const lastName = normalizeWhitespace(readString(body, 'lastName'))
  const firstName = normalizeWhitespace(readString(body, 'firstName'))
  const middleName = normalizeWhitespace(readString(body, 'middleName'))
  const birthDate = readString(body, 'birthDate')
  const gender = readString(body, 'gender')
  const phone = formatPhone(readString(body, 'phone'))
  const email = readString(body, 'email').trim()
  const preferredContact = readString(body, 'preferredContact')
  const address = normalizeWhitespace(readString(body, 'address'))
  const hasInsurance = readBoolean(body, 'hasInsurance')
  const insurer = readString(body, 'insurer')
  const insurerOther = normalizeWhitespace(readString(body, 'insurerOther'))
  const visitReason = readString(body, 'visitReason')
  const preferredDate = readString(body, 'preferredDate')
  const symptoms = normalizeWhitespace(readString(body, 'symptoms'))
  const consent = body.consent === true
  const guardianName = normalizeWhitespace(readString(body, 'guardianName'))
  const guardianPhone = formatPhone(readString(body, 'guardianPhone'))
  const policyNumber = formatPolicyNumber(readString(body, 'policyNumber'))

  const lastNameError = validateName(lastName)
  if (lastNameError) fail('lastName', lastNameError)
  const firstNameError = validateName(firstName)
  if (firstNameError) fail('firstName', firstNameError)
  if (middleName !== '') {
    const middleNameError = validateName(middleName)
    if (middleNameError) fail('middleName', middleNameError)
  }

  if (!parseIsoDate(birthDate)) {
    fail('birthDate', 'Укажите корректную дату рождения.')
  } else if (birthDate > today) {
    fail('birthDate', 'Дата рождения не может быть в будущем.')
  } else if (birthDate < '1900-01-01') {
    fail('birthDate', 'Проверьте дату рождения.')
  } else {
    const age = calculateAge(birthDate)
    if (age === null || age > 120) fail('birthDate', 'Проверьте дату рождения.')
  }

  if (!GENDERS.has(gender)) fail('gender', 'Выберите один из вариантов.')
  if (normalizePhone(phone).length !== 11) {
    fail('phone', 'Введите номер полностью: +7 (999) 123-45-67.')
  }

  const emailError = validateEmail(email)
  if (emailError) fail('email', emailError)

  if (!CONTACT_METHODS.has(preferredContact)) {
    fail('preferredContact', 'Выберите значение из списка.')
  }
  if (address.length > 300) fail('address', 'Не более 300 символов.')

  if (!VISIT_REASONS.has(visitReason)) {
    fail('visitReason', 'Выберите значение из списка.')
  }
  if (!parseIsoDate(preferredDate)) {
    fail('preferredDate', 'Укажите корректную дату приёма.')
  } else if (preferredDate < today) {
    fail('preferredDate', 'Выберите сегодняшнюю или будущую дату.')
  } else if (preferredDate > addDaysIso(90, parseIsoDate(today) ?? new Date())) {
    fail('preferredDate', 'Дата должна быть в пределах ближайших 90 дней.')
  }

  if (symptoms.length < 10) {
    fail('symptoms', 'Опишите причину визита подробнее (минимум 10 символов).')
  } else if (symptoms.length > 1000) {
    fail('symptoms', 'Не более 1000 символов.')
  }

  if (!consent) fail('consent', 'Подтвердите согласие, чтобы продолжить.')

  const minor = isMinor(birthDate)
  if (minor) {
    const guardianNameError = validateName(guardianName)
    if (guardianNameError) fail('guardianName', guardianNameError)
    if (normalizePhone(guardianPhone).length !== 11) {
      fail('guardianPhone', 'Введите номер полностью: +7 (999) 123-45-67.')
    }
  }

  if (hasInsurance) {
    if (onlyDigits(policyNumber).length !== 16) {
      fail('policyNumber', 'Номер полиса ОМС состоит из 16 цифр.')
    }
    if (!INSURERS.has(insurer)) {
      fail('insurer', 'Выберите значение из списка.')
    } else if (insurer === 'other') {
      if (insurerOther.length < 2) {
        fail('insurerOther', 'Укажите название страховой компании.')
      } else if (insurerOther.length > 100) {
        fail('insurerOther', 'Название компании слишком длинное.')
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Проверьте поля анкеты.', fieldErrors }
  }

  return {
    ok: true,
    patient: {
      lastName,
      firstName,
      middleName: middleName === '' ? null : middleName,
      birthDate,
      gender,
      guardianName: minor ? guardianName : null,
      guardianPhone: minor ? guardianPhone : null,
      phone,
      email,
      preferredContact,
      address: address === '' ? null : address,
      hasInsurance,
      policyNumber: hasInsurance ? policyNumber : null,
      insurer: hasInsurance ? insurer : null,
      insurerOther: hasInsurance && insurer === 'other' ? insurerOther : null,
      visitReason,
      preferredDate,
      symptoms,
    },
  }
}
