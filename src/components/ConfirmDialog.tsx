import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Native <dialog> gives focus trapping, Esc handling and the backdrop for free.
 * `open` is React state, so the component still behaves like a normal prop API.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="dialog-body">
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-desc">{description}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
