import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { t } from '../i18n'
import { IconButton } from './IconButton'
import { CloseIcon } from './pixel/icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Popup on a native <dialog>: focus stays inside, Esc or a click outside closes it,
 * and focus returns to whatever opened it. Content is mounted only while open.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressStartedOutside = useRef(false)
  const titleId = useId()

  // Layout effect so the dialog opens and closes in the same frame as its content.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      // Only the backdrop is the <dialog> itself; checking both ends ignores drags that leave the panel.
      onPointerDown={(event) => {
        pressStartedOutside.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressStartedOutside.current && event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="modal-panel">
          <header className="flex items-center justify-between gap-4 border-b-2 border-border py-3 pr-4 pl-6 sm:pl-8">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {title}
            </h2>
            <IconButton label={t('common.close')} onClick={onClose}>
              <CloseIcon className="text-base" />
            </IconButton>
          </header>
          <div className="overflow-y-auto px-6 py-6 text-lg sm:px-8">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-3 border-t-2 border-border px-6 py-4 sm:px-8">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
