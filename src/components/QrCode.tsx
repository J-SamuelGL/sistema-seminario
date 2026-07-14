import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(value, { width: 256 }).then(setDataUrl)
  }, [value])

  if (!dataUrl) return <div>Generando QR...</div>
  return (
    <img src={dataUrl} alt="Tu código de check-in" width={256} height={256} />
  )
}
