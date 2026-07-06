'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer } from 'lucide-react'

interface Props {
  slug: string
  businessName: string
}

export function BookingQr({ slug, businessName }: Props) {
  const [dataUrl, setDataUrl] = useState('')
  const bookingUrl = `https://www.quickturno.app/book/${slug}`

  useEffect(() => {
    QRCode.toDataURL(bookingUrl, { width: 480, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [bookingUrl])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-reservas-${slug}.png`
    a.click()
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=600,height=800')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>QR de reservas — ${businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { text-align: center; padding: 48px; }
    h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -0.02em; }
    p.sub { font-size: 16px; color: #555; margin: 0 0 28px; }
    img { width: 320px; height: 320px; }
    p.url { font-size: 13px; color: #888; margin-top: 20px; font-family: monospace; }
    p.cta { font-size: 18px; font-weight: 600; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${businessName}</h1>
    <p class="sub">Agenda tu cita en línea</p>
    <img src="${dataUrl}" alt="QR de reservas" />
    <p class="cta">📱 Escanea y reserva en segundos</p>
    <p class="url">${bookingUrl.replace('https://', '')}</p>
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body>
</html>`)
    win.document.close()
  }

  if (!dataUrl) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, marginTop: 12 }}>
      <img
        src={dataUrl}
        alt="QR de tu página de reservas"
        style={{ width: 88, height: 88, borderRadius: 8, background: '#fff', padding: 4 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>QR de tu página de reservas</p>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 10px' }}>
          Imprímelo y pégalo en tu local — tus clientes escanean y agendan solos.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer' }}
          >
            <Download size={13} />
            Descargar PNG
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer' }}
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
