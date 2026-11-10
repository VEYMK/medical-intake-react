interface ValidationMessageProps {
  /** Must match the control's aria-describedby target. */
  id: string
  message?: string
}

/**
 * One place for the red field error. Rendered only when there is a message,
 * so screen readers announce it via role="alert" as it appears.
 */
export function ValidationMessage({ id, message }: ValidationMessageProps) {
  if (!message) return null

  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  )
}
