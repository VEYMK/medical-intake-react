import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ApiError, createPatient } from '../api/patients'
import {
  clearDraft,
  getSafeStorage,
  loadDraft,
  saveDraft,
} from '../lib/draft'
import { toPatientInput } from '../lib/payload'
import { getProgress, validateAll } from '../lib/validators'
import {
  collectDraftValues,
  createInitialState,
  intakeReducer,
} from '../state/intakeReducer'
import type { FieldErrors, FieldName, FieldValue, Patient, SubmitStatus } from '../types'

export type DraftStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'unavailable'
  | 'disabled'

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'validation' | 'server' }

export interface UseIntakeForm {
  values: ReturnType<typeof createInitialState>['values']
  errors: FieldErrors
  touched: Partial<Record<FieldName, boolean>>
  status: SubmitStatus
  submitError: string | null
  savedPatient: Patient | null
  reference: string | null
  restoredAt: Date | null
  draftStatus: DraftStatus
  draftEnabled: boolean
  draftAvailable: boolean
  lastSavedAt: Date | null
  progress: { filled: number; total: number }
  change: (name: FieldName, value: FieldValue) => void
  blur: (name: FieldName) => void
  submit: () => Promise<SubmitResult>
  reset: () => void
  dismissRestored: () => void
  setDraftEnabled: (enabled: boolean) => void
  saveDraftNow: () => void
}

export function useIntakeForm(): UseIntakeForm {
  const [storage] = useState<Storage | null>(() => getSafeStorage())
  const [initialDraft] = useState(() => loadDraft(storage))
  const [draftEnabled, setDraftEnabledState] = useState(storage !== null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(() => {
    if (!storage) return 'unavailable'
    return initialDraft.status === 'ok' ? 'saved' : 'idle'
  })
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialDraft.status === 'ok' ? initialDraft.savedAt : null,
  )

  const [state, dispatch] = useReducer(intakeReducer, undefined, () =>
    initialDraft.status === 'ok'
      ? createInitialState(initialDraft.values, initialDraft.savedAt)
      : createInitialState(),
  )

  const persistedRef = useRef<string>(
    JSON.stringify(
      collectDraftValues(
        initialDraft.status === 'ok'
          ? createInitialState(initialDraft.values).values
          : createInitialState().values,
      ),
    ),
  )

  const change = useCallback((name: FieldName, value: FieldValue) => {
    dispatch({ type: 'change', name, value })
  }, [])

  const blur = useCallback((name: FieldName) => {
    dispatch({ type: 'blur', name })
  }, [])

  const dismissRestored = useCallback(() => {
    dispatch({ type: 'draft/dismiss' })
  }, [])

  const reset = useCallback(() => {
    if (storage) clearDraft(storage)
    persistedRef.current = '{}'
    setDraftStatus(storage ? 'idle' : 'unavailable')
    setLastSavedAt(null)
    dispatch({ type: 'reset' })
  }, [storage])

  const saveDraftNow = useCallback(() => {
    if (!storage) {
      setDraftStatus('unavailable')
      return
    }
    if (!draftEnabled) {
      setDraftStatus('disabled')
      return
    }
    const values = collectDraftValues(state.values)
    const result = saveDraft(values, storage)
    if (result.ok) {
      persistedRef.current = JSON.stringify(values)
      setLastSavedAt(result.savedAt)
      setDraftStatus('saved')
    } else {
      setDraftStatus(result.reason === 'quota' ? 'error' : 'unavailable')
    }
  }, [storage, draftEnabled, state.values])

  const setDraftEnabled = useCallback(
    (enabled: boolean) => {
      if (!storage) return
      setDraftEnabledState(enabled)
      if (!enabled) {
        clearDraft(storage)
        persistedRef.current = ''
        setLastSavedAt(null)
        setDraftStatus('disabled')
      } else {
        persistedRef.current = ''
        setDraftStatus('idle')
      }
    },
    [storage],
  )

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (state.status === 'submitting') return { ok: false, reason: 'server' }

    const errors = validateAll(state.values)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'validate/fail', errors })
      return { ok: false, reason: 'validation' }
    }

    dispatch({ type: 'submit/start' })
    try {
      const response = await createPatient(toPatientInput(state.values))
      if (storage) clearDraft(storage)
      persistedRef.current = '{}'
      setLastSavedAt(null)
      setDraftStatus('idle')
      dispatch({ type: 'submit/success', response })
      return { ok: true }
    } catch (error) {
      // Keep the answers safe locally when the network fails, so the user can
      // retry without filling the form again.
      if (storage && draftEnabled) {
        const values = collectDraftValues(state.values)
        const saved = saveDraft(values, storage)
        if (saved.ok) {
          persistedRef.current = JSON.stringify(values)
          setLastSavedAt(saved.savedAt)
          setDraftStatus('saved')
        }
      }

      const fieldErrors = error instanceof ApiError ? error.fieldErrors : {}
      const message =
        error instanceof ApiError
          ? error.message
          : 'Не удалось отправить анкету. Проверьте соединение и попробуйте ещё раз.'
      dispatch({ type: 'submit/error', message, fieldErrors })
      return { ok: false, reason: 'server' }
    }
  }, [state.status, state.values, storage, draftEnabled])

  // Debounced draft persistence. The serialized snapshot prevents a redundant
  // write on mount (and the double effect run in React StrictMode).
  useEffect(() => {
    if (!storage || !draftEnabled || state.status === 'success') return

    const values = collectDraftValues(state.values)
    const serialized = JSON.stringify(values)
    if (serialized === persistedRef.current) return

    setDraftStatus('saving')
    const timer = window.setTimeout(() => {
      const result = saveDraft(values, storage)
      if (result.ok) {
        persistedRef.current = serialized
        setLastSavedAt(result.savedAt)
        setDraftStatus('saved')
      } else {
        setDraftStatus(result.reason === 'quota' ? 'error' : 'unavailable')
      }
    }, 500)

    return () => window.clearTimeout(timer)
  }, [state.values, state.status, storage, draftEnabled])

  const progress = useMemo(() => getProgress(state.values), [state.values])

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    status: state.status,
    submitError: state.submitError,
    savedPatient: state.savedPatient,
    reference: state.reference,
    restoredAt: state.restoredAt,
    draftStatus,
    draftEnabled,
    draftAvailable: storage !== null,
    lastSavedAt,
    progress,
    change,
    blur,
    submit,
    reset,
    dismissRestored,
    setDraftEnabled,
    saveDraftNow,
  }
}
