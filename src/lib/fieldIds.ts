import type { FieldName } from '../types'
import type { FormFieldSchema } from '../schema'

/** ID of the first focusable control of a field. */
export function controlId(name: FieldName): string {
  return `field-${name}`
}

export function radioId(name: FieldName, optionValue: string): string {
  return `field-${name}-${optionValue}`
}

export function errorId(name: FieldName): string {
  return `field-${name}-error`
}

export function hintId(name: FieldName): string {
  return `field-${name}-hint`
}

/** Anchor used by the error summary; radios focus their first option. */
export function fieldAnchorId(field: FormFieldSchema): string {
  if (field.type === 'radio') {
    const first = field.options?.[0]
    return first ? radioId(field.name, first.value) : controlId(field.name)
  }
  return controlId(field.name)
}
