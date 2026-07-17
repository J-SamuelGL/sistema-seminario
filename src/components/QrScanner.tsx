import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// html5-qrcode invoca el callback de éxito en cada frame donde logra
// decodificar el QR (varias veces por segundo mientras el código sigue
// frente a la cámara), no una sola vez por código mostrado. Sin este
// cooldown, cada frame repetido dispara un nuevo onScan y por lo tanto
// una nueva mutación, así que la UI nunca deja de mostrar "Procesando".
const COOLDOWN_MISMO_TOKEN_MS = 3000

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerId = 'qr-scanner-container'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const ultimoTokenRef = useRef<string | null>(null)
  const ultimoTiempoRef = useRef(0)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    let desmontado = false

    // stop() lanza síncronamente (no rechaza una promesa) cuando el
    // gestor de estados interno de la librería todavía no llegó a
    // "scanning" — ese estado interno no es lo mismo que el campo
    // público scanner.isScanning, así que en vez de adivinarlo desde
    // afuera dejamos que stop() decida y solo atajamos el throw.
    function detenerSiSePuede() {
      try {
        scanner.stop().catch(() => {})
      } catch {
        // Todavía no había terminado de iniciar; nada que detener.
      }
    }

    // Se difiere un microtask antes de pedir la cámara: el doble montaje
    // de StrictMode en desarrollo (monta -> desmonta -> monta) corre
    // ambos montajes de forma síncrona, así que para cuando este
    // microtask se ejecuta el montaje "fantasma" ya se desmontó y
    // desmontado ya es true — evitando que dos instancias compitan por
    // el mismo contenedor del DOM.
    queueMicrotask(() => {
      if (desmontado) return
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            const ahora = Date.now()
            if (
              decodedText === ultimoTokenRef.current &&
              ahora - ultimoTiempoRef.current < COOLDOWN_MISMO_TOKEN_MS
            ) {
              return
            }
            ultimoTokenRef.current = decodedText
            ultimoTiempoRef.current = ahora
            onScanRef.current(decodedText)
          },
          () => {},
        )
        .then(() => {
          // El efecto pudo desmontarse mientras start() seguía pendiente.
          if (desmontado) detenerSiSePuede()
        })
        .catch((err) => console.error('No se pudo iniciar la cámara', err))
    })

    return () => {
      desmontado = true
      detenerSiSePuede()
    }
  }, [])

  return <div id={containerId} style={{ width: 300 }} />
}
