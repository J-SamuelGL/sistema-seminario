import { useEffect, useRef } from 'react'

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportamiento básico de accesibilidad para modales: enfoca el primer
 * elemento enfocable al abrir, atrapa el foco con Tab dentro del modal y
 * (opcionalmente) cierra con Escape.
 */
export function useModalA11y({
  onClose,
  closeOnEscape = true,
}: {
  onClose?: () => void
  closeOnEscape?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const contenedor = ref.current
    if (!contenedor) return
    const enfocable = contenedor.querySelector<HTMLElement>(SELECTOR_ENFOCABLE)
    enfocable?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (closeOnEscape && onClose) onClose()
        return
      }
      if (e.key !== 'Tab' || !contenedor) return
      const elementos = Array.from(
        contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE),
      )
      if (elementos.length === 0) return
      const primero = elementos[0]
      const ultimo = elementos[elementos.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, closeOnEscape])

  return ref
}
