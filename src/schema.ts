import { addDaysIso, isMinor, todayIso } from './lib/formatters'
import type { FieldName, FormValues } from './types'

export const SCHEMA_VERSION = 1

export interface FieldOption {
  readonly value: string
  readonly label: string
}

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'textarea'
  | 'radio'
  | 'select'
  | 'checkbox'

export type ValidationKind =
  | 'name'
  | 'email'
  | 'phone'
  | 'birthDate'
  | 'preferredDate'
  | 'policyNumber'
  | 'symptoms'
  | 'company'
  | 'address'
  | 'consent'

export interface FormFieldSchema {
  readonly name: FieldName
  readonly label: string
  readonly type: FieldType
  readonly required: boolean | ((values: FormValues) => boolean)
  readonly visibleWhen?: (values: FormValues) => boolean
  readonly validation?: ValidationKind
  readonly mask?: 'phone' | 'policy'
  readonly options?: readonly FieldOption[]
  readonly autocomplete?: string
  readonly autocapitalize?: 'none' | 'words'
  readonly inputMode?: 'tel' | 'email' | 'numeric'
  readonly spellCheck?: boolean
  readonly placeholder?: string
  readonly maxLength?: number
  readonly minLength?: number
  readonly rows?: number
  readonly min?: string | (() => string)
  readonly max?: string | (() => string)
  readonly span?: 'half' | 'full'
  readonly hint?: string
  readonly counter?: boolean
}

export interface FormSection {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly fields: readonly FormFieldSchema[]
}

const yesNoOptions: readonly FieldOption[] = [
  { value: 'yes', label: 'Да, есть полис' },
  { value: 'no', label: 'Нет, оплачу самостоятельно' },
]

const genderOptions: readonly FieldOption[] = [
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'other', label: 'Другой' },
  { value: 'undisclosed', label: 'Не хочу указывать' },
]

const contactOptions: readonly FieldOption[] = [
  { value: 'phone', label: 'Телефонный звонок' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
]

const insurerOptions: readonly FieldOption[] = [
  { value: 'sogaz', label: 'СОГАЗ' },
  { value: 'alfa', label: 'АльфаСтрахование' },
  { value: 'ingos', label: 'Ингосстрах' },
  { value: 'vsk', label: 'ВСК' },
  { value: 'other', label: 'Другая компания' },
]

const visitReasonOptions: readonly FieldOption[] = [
  { value: 'consultation', label: 'Первичная консультация' },
  { value: 'checkup', label: 'Профилактический осмотр' },
  { value: 'followup', label: 'Повторный приём' },
  { value: 'tests', label: 'Сдача анализов' },
  { value: 'other', label: 'Другое' },
]

export function hasInsurance(values: FormValues): boolean {
  return values.hasInsurance === 'yes'
}

export function needsOtherInsurer(values: FormValues): boolean {
  return hasInsurance(values) && values.insurer === 'other'
}

export function needsGuardian(values: FormValues): boolean {
  return isMinor(values.birthDate)
}

export const SECTIONS: readonly FormSection[] = [
  {
    id: 'personal',
    title: 'Личные данные',
    description:
      'Укажите данные так, как они записаны в паспорте или свидетельстве о рождении.',
    fields: [
      {
        name: 'lastName',
        label: 'Фамилия',
        type: 'text',
        required: true,
        validation: 'name',
        autocomplete: 'family-name',
        autocapitalize: 'words',
        placeholder: 'Иванов',
        maxLength: 60,
        span: 'half',
      },
      {
        name: 'firstName',
        label: 'Имя',
        type: 'text',
        required: true,
        validation: 'name',
        autocomplete: 'given-name',
        autocapitalize: 'words',
        placeholder: 'Иван',
        maxLength: 60,
        span: 'half',
      },
      {
        name: 'middleName',
        label: 'Отчество',
        type: 'text',
        required: false,
        validation: 'name',
        autocomplete: 'additional-name',
        autocapitalize: 'words',
        placeholder: 'Иванович',
        maxLength: 60,
        span: 'half',
      },
      {
        name: 'birthDate',
        label: 'Дата рождения',
        type: 'date',
        required: true,
        validation: 'birthDate',
        autocomplete: 'bday',
        min: '1900-01-01',
        max: () => todayIso(),
        span: 'half',
        hint: 'Если пациенту меньше 18 лет, понадобятся данные представителя.',
      },
      {
        name: 'gender',
        label: 'Пол',
        type: 'radio',
        required: true,
        options: genderOptions,
        span: 'full',
      },
      {
        name: 'guardianName',
        label: 'ФИО законного представителя',
        type: 'text',
        required: needsGuardian,
        visibleWhen: needsGuardian,
        validation: 'name',
        autocomplete: 'name',
        autocapitalize: 'words',
        placeholder: 'Петрова Анна Сергеевна',
        maxLength: 120,
        span: 'half',
        hint: 'Заполняется, если пациент младше 18 лет.',
      },
      {
        name: 'guardianPhone',
        label: 'Телефон представителя',
        type: 'tel',
        required: needsGuardian,
        visibleWhen: needsGuardian,
        validation: 'phone',
        mask: 'phone',
        autocomplete: 'tel',
        inputMode: 'tel',
        placeholder: '+7 (999) 123-45-67',
        maxLength: 18,
        span: 'half',
      },
    ],
  },
  {
    id: 'contacts',
    title: 'Контакты',
    description:
      'По этим контактам администратор подтвердит запись. Телефон обязателен.',
    fields: [
      {
        name: 'phone',
        label: 'Телефон',
        type: 'tel',
        required: true,
        validation: 'phone',
        mask: 'phone',
        autocomplete: 'tel',
        inputMode: 'tel',
        placeholder: '+7 (999) 123-45-67',
        maxLength: 18,
        span: 'half',
        hint: 'Можно вставить номер в любом формате — он приведётся к +7 (999) 123-45-67.',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        validation: 'email',
        autocomplete: 'email',
        inputMode: 'email',
        autocapitalize: 'none',
        spellCheck: false,
        placeholder: 'name@example.com',
        maxLength: 254,
        span: 'half',
      },
      {
        name: 'preferredContact',
        label: 'Предпочтительный способ связи',
        type: 'select',
        required: true,
        autocomplete: 'off',
        options: contactOptions,
        placeholder: 'Выберите способ связи',
        span: 'half',
      },
      {
        name: 'address',
        label: 'Адрес проживания',
        type: 'textarea',
        required: false,
        validation: 'address',
        autocomplete: 'street-address',
        placeholder: 'Город, улица, дом, квартира',
        maxLength: 300,
        rows: 2,
        span: 'full',
        hint: 'Необязательно. Нужен только для выезда врача на дом.',
      },
    ],
  },
  {
    id: 'insurance',
    title: 'Страхование',
    description:
      'Если у вас есть полис ОМС или ДМС, укажите его — это ускорит оформление.',
    fields: [
      {
        name: 'hasInsurance',
        label: 'Есть ли у вас полис?',
        type: 'radio',
        required: true,
        options: yesNoOptions,
        span: 'full',
      },
      {
        name: 'policyNumber',
        label: 'Номер полиса',
        type: 'text',
        required: true,
        visibleWhen: hasInsurance,
        validation: 'policyNumber',
        mask: 'policy',
        inputMode: 'numeric',
        autocomplete: 'off',
        placeholder: '1234 5678 9012 3456',
        maxLength: 19,
        span: 'half',
        hint: '16 цифр полиса ОМС. Пробелы расставляются автоматически.',
      },
      {
        name: 'insurer',
        label: 'Страховая компания',
        type: 'select',
        required: true,
        visibleWhen: hasInsurance,
        options: insurerOptions,
        placeholder: 'Выберите компанию',
        span: 'half',
      },
      {
        name: 'insurerOther',
        label: 'Название страховой компании',
        type: 'text',
        required: true,
        visibleWhen: needsOtherInsurer,
        validation: 'company',
        autocomplete: 'organization',
        placeholder: 'Например, «Медстрах»',
        maxLength: 100,
        span: 'half',
      },
    ],
  },
  {
    id: 'visit',
    title: 'Визит',
    description:
      'Расскажите, что вас беспокоит, и выберите удобную дату. Врач ознакомится с ответами заранее.',
    fields: [
      {
        name: 'visitReason',
        label: 'Причина обращения',
        type: 'select',
        required: true,
        options: visitReasonOptions,
        placeholder: 'Выберите причину',
        span: 'half',
      },
      {
        name: 'preferredDate',
        label: 'Желаемая дата приёма',
        type: 'date',
        required: true,
        validation: 'preferredDate',
        min: () => todayIso(),
        max: () => addDaysIso(90),
        span: 'half',
        hint: 'Можно выбрать дату в течение ближайших 90 дней.',
      },
      {
        name: 'symptoms',
        label: 'Что вас беспокоит?',
        type: 'textarea',
        required: true,
        validation: 'symptoms',
        placeholder:
          'Коротко опишите жалобы, когда они начались и что уже принимали',
        minLength: 10,
        maxLength: 1000,
        rows: 5,
        span: 'full',
        counter: true,
        hint: 'Минимум 10 символов. Не указывайте данные, не относящиеся к визиту.',
      },
      {
        name: 'consent',
        label:
          'Я согласен(на) на обработку персональных данных и подтверждаю достоверность сведений',
        type: 'checkbox',
        required: true,
        validation: 'consent',
        span: 'full',
        hint: 'Согласие не сохраняется в черновике — после перезагрузки его нужно подтвердить заново.',
      },
    ],
  },
]

export const ALL_FIELDS: readonly FormFieldSchema[] = SECTIONS.flatMap(
  (section) => section.fields,
)

export function getField(name: FieldName): FormFieldSchema | undefined {
  return ALL_FIELDS.find((field) => field.name === name)
}

export function isVisible(field: FormFieldSchema, values: FormValues): boolean {
  return field.visibleWhen ? field.visibleWhen(values) : true
}

export function isRequired(field: FormFieldSchema, values: FormValues): boolean {
  return typeof field.required === 'function'
    ? field.required(values)
    : field.required
}

/** Empty form values. Exported so the reducer and tests share one source. */
export function createEmptyValues(): FormValues {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    birthDate: '',
    gender: '',
    guardianName: '',
    guardianPhone: '',
    phone: '',
    email: '',
    preferredContact: '',
    address: '',
    hasInsurance: '',
    policyNumber: '',
    insurer: '',
    insurerOther: '',
    visitReason: '',
    preferredDate: '',
    symptoms: '',
    consent: false,
  }
}

/** Drops answers that stopped being relevant (insurance = no, adult patient). */
export function clearHiddenValues(values: FormValues): FormValues {
  const next: FormValues = { ...values }

  if (!hasInsurance(next)) {
    next.policyNumber = ''
    next.insurer = ''
    next.insurerOther = ''
  } else if (next.insurer !== 'other') {
    next.insurerOther = ''
  }

  if (!needsGuardian(next)) {
    next.guardianName = ''
    next.guardianPhone = ''
  }

  return next
}
