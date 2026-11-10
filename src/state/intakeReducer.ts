import {
  ALL_FIELDS,
  clearHiddenValues,
  createEmptyValues,
  getField,
  isVisible,
} from '../schema'
import {
  formatPhone,
  formatPolicyNumber,
  normalizeWhitespace,
} from '../lib/formatters'
import { validateField } from '../lib/validators'
import type { DraftValues } from '../lib/draft'
import type {
  FieldErrors,
  FieldName,
  FieldValue,
  FormResponse,
  FormValues,
  Patient,
  SubmitStatus,
} from '../types'

export interface IntakeState {
  values: FormValues
  errors: FieldErrors
  touched: Partial<Record<FieldName, boolean>>
  status: SubmitStatus
  submitError: string | null
  savedPatient: Patient | null
  reference: string | null
  restoredAt: Date | null
}

export type IntakeAction =
  | { type: 'change'; name: FieldName; value: FieldValue }
  | { type: 'blur'; name: FieldName }
  | { type: 'validate/fail'; errors: FieldErrors }
  | { type: 'submit/start' }
  | { type: 'submit/success'; response: FormResponse }
  | { type: 'submit/error'; message: string; fieldErrors: FieldErrors }
  | { type: 'draft/restore'; values: DraftValues; savedAt: Date }
  | { type: 'draft/dismiss' }
  | { type: 'reset' }

export function createInitialState(values?: DraftValues, savedAt?: Date): IntakeState {
  const base = createEmptyValues()
  return {
    values: values ? mergeDraft(base, values) : base,
    errors: {},
    touched: {},
    status: 'idle',
    submitError: null,
    savedPatient: null,
    reference: null,
    restoredAt: savedAt ?? null,
  }
}

function withValue(
  values: FormValues,
  name: FieldName,
  value: FieldValue,
): FormValues {
  const next: FormValues = { ...values }
  const record: Record<FieldName, FieldValue> = next
  record[name] = value
  return next
}

function mergeDraft(base: FormValues, draft: DraftValues): FormValues {
  let next: FormValues = { ...base }
  for (const field of ALL_FIELDS) {
    const value = draft[field.name]
    if (value === undefined) continue
    if (field.type === 'checkbox') {
      if (typeof value === 'boolean') next = withValue(next, field.name, value)
    } else if (typeof value === 'string') {
      next = withValue(next, field.name, value)
    }
  }
  return clearHiddenValues(next)
}

/**
 * Revalidates only fields the user has already seen an error on (or touched).
 * Untouched fields stay quiet until blur or submit, which avoids an angry red
 * form the moment the page opens.
 */
function revalidateVisible(
  state: IntakeState,
  values: FormValues,
  extraTouched: FieldName | null,
): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of ALL_FIELDS) {
    if (!isVisible(field, values)) continue
    const touched = extraTouched === field.name || state.touched[field.name]
    if (!touched && !state.errors[field.name]) continue
    const message = validateField(field, values[field.name], values)
    if (message) errors[field.name] = message
  }

  return errors
}

function applyMask(name: FieldName, value: FieldValue): FieldValue {
  const field = getField(name)
  if (!field || typeof value !== 'string') return value
  if (field.mask === 'phone') return formatPhone(value)
  if (field.mask === 'policy') return formatPolicyNumber(value)
  return value
}

export function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'change': {
      const field = getField(action.name)
      if (!field) return state

      const value = applyMask(action.name, action.value)
      const values = clearHiddenValues(withValue(state.values, action.name, value))

      // A choice is committed the moment it is clicked; text fields wait for
      // blur or submit so the user does not see "too short" while typing.
      const commitChoice =
        field.type === 'radio' || field.type === 'select' || field.type === 'checkbox'
      const touched: Partial<Record<FieldName, boolean>> = commitChoice
        ? { ...state.touched, [action.name]: true }
        : state.touched
      const errors = revalidateVisible(
        state,
        values,
        commitChoice ? action.name : null,
      )

      return { ...state, values, touched, errors }
    }

    case 'blur': {
      const field = getField(action.name)
      if (!field) return state

      // An empty field the user never interacted with is not an error yet.
      // Besides being calmer UX, this makes reset deterministic: closing the
      // confirm dialog restores focus to the previously focused control, and
      // that late blur must not flag a field the reset has just cleared.
      const currentValue = state.values[action.name]
      const wasTouched = state.touched[action.name] === true
      const hadError = Boolean(state.errors[action.name])
      if (
        !wasTouched &&
        !hadError &&
        (typeof currentValue === 'string' ? currentValue.trim() === '' : currentValue === false)
      ) {
        return state
      }

      let values = state.values
      const current = values[action.name]
      if (typeof current === 'string') {
        let normalized = current
        if (field.validation === 'name' || field.validation === 'company') {
          normalized = normalizeWhitespace(current)
        } else if (field.type === 'email') {
          normalized = current.trim()
        }
        if (normalized !== current) {
          values = withValue(values, action.name, normalized)
        }
      }

      const touched: Partial<Record<FieldName, boolean>> = {
        ...state.touched,
        [action.name]: true,
      }
      const errors = { ...state.errors }
      const message = validateField(field, values[action.name], values)
      if (message) errors[action.name] = message
      else delete errors[action.name]
      return { ...state, values, touched, errors }
    }

    case 'validate/fail':
      return {
        ...state,
        errors: action.errors,
        touched: Object.fromEntries(
          Object.keys(action.errors).map((name) => [name, true]),
        ) as Partial<Record<FieldName, boolean>>,
        status: 'idle',
        submitError: null,
      }

    case 'submit/start':
      return { ...state, status: 'submitting', submitError: null }

    case 'submit/success':
      return {
        ...state,
        status: 'success',
        submitError: null,
        savedPatient: action.response.patient,
        reference: action.response.reference,
        errors: {},
        restoredAt: null,
      }

    case 'submit/error':
      return {
        ...state,
        status: 'error',
        submitError: action.message,
        errors: { ...state.errors, ...action.fieldErrors },
      }

    case 'draft/restore':
      return {
        ...state,
        values: mergeDraft(createEmptyValues(), action.values),
        restoredAt: action.savedAt,
      }

    case 'draft/dismiss':
      return { ...state, restoredAt: null }

    case 'reset':
      return createInitialState()

    default:
      return state
  }
}

/** Collects the draft: visible answers only, consent is never stored. */
export function collectDraftValues(values: FormValues): DraftValues {
  const result: DraftValues = {}

  for (const field of ALL_FIELDS) {
    if (field.name === 'consent') continue
    if (!isVisible(field, values)) continue
    const value = values[field.name]
    if (typeof value === 'string') {
      if (value.trim() !== '') result[field.name] = value
    } else if (value === true) {
      result[field.name] = value
    }
  }

  return result
}
