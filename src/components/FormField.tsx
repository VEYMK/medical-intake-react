import { useLayoutEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import {
  caretAfterMask,
  formatPhone,
  formatPolicyNumber,
} from '../lib/formatters'
import { controlId, errorId, hintId, radioId } from '../lib/fieldIds'
import type { FormFieldSchema } from '../schema'
import type { FieldName, FieldValue } from '../types'
import { ValidationMessage } from './ValidationMessage'

interface FormFieldProps {
  /** Schema drives the markup: one component for text, select, radio, checkbox. */
  field: FormFieldSchema
  /** Controlled value passed down from the reducer. */
  value: FieldValue
  error?: string
  required: boolean
  disabled?: boolean
  onChange: (name: FieldName, value: FieldValue) => void
  onBlur: (name: FieldName) => void
}

function maskValue(field: FormFieldSchema, raw: string): string {
  if (field.mask === 'phone') return formatPhone(raw)
  if (field.mask === 'policy') return formatPolicyNumber(raw)
  return raw
}

export function FormField({
  field,
  value,
  error,
  required,
  disabled = false,
  onChange,
  onBlur,
}: FormFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const caretRef = useRef<number | null>(null)
  const stringValue = typeof value === 'string' ? value : ''

  const describedBy =
    [field.hint ? hintId(field.name) : null, error ? errorId(field.name) : null]
      .filter((id): id is string => id !== null)
      .join(' ') || undefined

  // Keep the caret in place when a mask inserts brackets or spaces.
  useLayoutEffect(() => {
    const input = inputRef.current
    const caret = caretRef.current
    if (!input || caret === null) return
    caretRef.current = null
    input.setSelectionRange(caret, caret)
  }, [value])

  const handleMaskedChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const raw = input.value
    const masked = maskValue(field, raw)

    if (masked !== raw) {
      const caret = input.selectionStart ?? raw.length
      caretRef.current = caretAfterMask(raw, caret, masked, field.mask === 'phone')
    } else {
      caretRef.current = null
    }

    onChange(field.name, raw)
  }

  const fieldClass = [
    'field',
    field.span === 'full' ? 'field--full' : '',
    error ? 'has-error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = (
    <>
      {field.label}
      {required && (
        <span className="req" aria-hidden="true">
          *
        </span>
      )}
    </>
  )

  const hint = field.hint ? (
    <p className="field-hint" id={hintId(field.name)}>
      {field.hint}
    </p>
  ) : null

  if (field.type === 'radio') {
    return (
      <fieldset className={fieldClass} aria-describedby={describedBy}>
        <legend className="field-label">{label}</legend>
        {hint}
        <div className="choices">
          {(field.options ?? []).map((option) => (
            <label className="choice" key={option.value}>
              <input
                type="radio"
                name={field.name}
                id={radioId(field.name, option.value)}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                aria-required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                onChange={() => onChange(field.name, option.value)}
                onBlur={() => onBlur(field.name)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <ValidationMessage id={errorId(field.name)} message={error} />
      </fieldset>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className={fieldClass}>
        <label className="check">
          <input
            type="checkbox"
            id={controlId(field.name)}
            name={field.name}
            checked={value === true}
            disabled={disabled}
            aria-required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange(field.name, event.target.checked)}
            onBlur={() => onBlur(field.name)}
          />
          <span>{label}</span>
        </label>
        {hint}
        <ValidationMessage id={errorId(field.name)} message={error} />
      </div>
    )
  }

  const controlIdValue = controlId(field.name)
  const min = typeof field.min === 'function' ? field.min() : field.min
  const max = typeof field.max === 'function' ? field.max() : field.max

  return (
    <div className={fieldClass}>
      <label className="field-label" htmlFor={controlIdValue}>
        {label}
      </label>
      {hint}

      {field.type === 'textarea' ? (
        <textarea
          id={controlIdValue}
          name={field.name}
          value={stringValue}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          minLength={field.minLength}
          placeholder={field.placeholder}
          autoComplete={field.autocomplete}
          disabled={disabled}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(field.name, event.target.value)}
          onBlur={() => onBlur(field.name)}
        />
      ) : field.type === 'select' ? (
        <select
          id={controlIdValue}
          name={field.name}
          value={stringValue}
          autoComplete={field.autocomplete}
          disabled={disabled}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(field.name, event.target.value)}
          onBlur={() => onBlur(field.name)}
        >
          <option value="">{field.placeholder ?? 'Выберите значение'}</option>
          {(field.options ?? []).map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={field.mask ? inputRef : undefined}
          type={field.type}
          id={controlIdValue}
          name={field.name}
          value={stringValue}
          min={min}
          max={max}
          minLength={field.minLength}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          autoComplete={field.autocomplete}
          autoCapitalize={field.autocapitalize}
          inputMode={field.inputMode}
          spellCheck={field.spellCheck}
          disabled={disabled}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={handleMaskedChange}
          onBlur={() => onBlur(field.name)}
        />
      )}

      {field.counter && field.maxLength ? (
        <span
          className={`counter${
            stringValue.length > field.maxLength * 0.9 ? ' is-near-limit' : ''
          }`}
        >
          {stringValue.length} / {field.maxLength}
        </span>
      ) : null}

      <ValidationMessage id={errorId(field.name)} message={error} />
    </div>
  )
}
