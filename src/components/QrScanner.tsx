import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerId = 'qr-scanner-container'
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => onScan(decodedText),
        () => {},
      )
      .catch((err) => console.error('No se pudo iniciar la cámara', err))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return <div id={containerId} style={{ width: 300 }} />
}
