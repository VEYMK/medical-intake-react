import type { RefObject } from 'react'
import { ALL_FIELDS } from '../schema'
import { fieldAnchorId } from '../lib/fieldIds'
import type { FieldErrors, FieldName } from '../types'

interface ErrorSummaryProps {
  errors: FieldErrors
  onFocusField: (name: FieldName) => void
  summaryRef: RefObject<HTMLDivElement | null>
}

/**
 * Links every invalid field to its control. Focus moves here after a failed
 * submit so keyboard and screen-reader users hear the whole list first.
 */
export function ErrorSummary({ errors, onFocusField, summaryRef }: ErrorSummaryProps) {
  const items = ALL_FIELDS.filter((field) => Boolean(errors[field.name])).map(
    (field) => ({
      name: field.name,
      label: field.label,
      message: errors[field.name] ?? '',
      anchor: fieldAnchorId(field),
    }),
  )

  if (items.length === 0) return null

  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
      <h2>Проверьте форму</h2>
      <p>Некоторые поля заполнены неверно. Перейдите к ним по ссылкам:</p>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            <a
              href={`#${item.anchor}`}
              onClick={(event) => {
                event.preventDefault()
                onFocusField(item.name)
              }}
            >
              {item.label}: {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
