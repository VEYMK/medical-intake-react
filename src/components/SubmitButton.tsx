interface SubmitButtonProps {
  isSubmitting: boolean
  disabled?: boolean
}

/**
 * The submit control is driven entirely by props from the form state machine:
 * while a request is in flight it is disabled and reports aria-busy.
 */
export function SubmitButton({ isSubmitting, disabled = false }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className="btn btn--primary"
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Отправляем…</span>
        </>
      ) : (
        <span>Отправить анкету</span>
      )}
    </button>
  )
}
