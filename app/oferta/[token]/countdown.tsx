'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0'))
}

export function Countdown({ expiresAt }: { expiresAt: number }) {
  const router = useRouter()
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const ms = expiresAt - Date.now()
      setLeft(ms)
      if (ms <= 0) router.refresh()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, router])

  const [h, m, s] = parts(left ?? 0)
  const units: [string, string][] = [[h, 'horas'], [m, 'min'], [s, 'seg']]
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} aria-live="off">
      {units.map(([v, label]) => (
        <div key={label} style={{ background: '#161616', border: '1px solid #262626', borderRadius: 14, padding: '12px 0', width: 82, textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: '#ebebeb', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{left === null ? '--' : v}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
