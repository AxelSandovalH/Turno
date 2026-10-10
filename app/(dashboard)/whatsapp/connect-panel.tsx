'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RefreshCw, Send, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type State = 'connected' | 'qr' | 'loading' | 'disconnected' | 'unknown' | 'pending'
interface Status { state: State; qr?: string | null }

const STEPS = [
  'Abre WhatsApp en el teléfono del negocio.',
  'Toca Ajustes y luego Dispositivos vinculados.',
  'Toca Vincular un dispositivo y escanea este código.',
]

export function ConnectPanel({ businessName }: { businessName: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const wasConnected = useRef(false)
  // Tras pedir la desconexión, UltraMsg tarda unos segundos en cerrar la sesión
  const disconnectingUntil = useRef(0)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/connection', { cache: 'no-store' })
      if (!res.ok) return
      const data: Status = await res.json()
      // Mientras se cierra la sesión no se vuelve a mostrar "conectado"
      if (disconnectingUntil.current) {
        if (data.state !== 'connected') { disconnectingUntil.current = 0; setDisconnecting(false) }
        else if (Date.now() < disconnectingUntil.current) return
        else { disconnectingUntil.current = 0; setDisconnecting(false); toast.error('UltraMsg no cerró la sesión. Intenta de nuevo o revisa la instancia en su panel.') }
      }
      setStatus(data)
      if (data.state === 'connected' && !wasConnected.current) {
        wasConnected.current = true
        router.refresh() // actualiza la guía de primeros pasos
      }
      if (data.state !== 'connected') wasConnected.current = false
    } catch { /* se reintenta en el siguiente ciclo */ }
  }, [router])

  // Consulta el estado cada 3 segundos mientras la pestaña esté visible; el QR se renueva solo
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let stopped = false
    let first = true
    const tick = async () => {
      if (stopped) return
      // La primera consulta siempre sale; las siguientes se pausan si la pestaña está oculta
      if (first || document.visibilityState === 'visible') await fetchStatus()
      first = false
      if (!stopped) timer = setTimeout(tick, 3000)
    }
    tick()
    return () => { stopped = true; clearTimeout(timer) }
  }, [fetchStatus])

  async function act(action: 'test' | 'disconnect' | 'restart') {
    setBusy(true)
    try {
      const res = await fetch('/api/whatsapp/connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        console.error('[whatsapp]', action, data)
        toast.error(`${data?.error ?? 'No se pudo completar la acción'}${data?.detail ? ` (${String(data.detail).slice(0, 120)})` : ''}`)
        return
      }
      if (action === 'test') toast.success('Listo. Te mandamos un mensaje de prueba por WhatsApp.')
      else {
        if (action === 'disconnect') { disconnectingUntil.current = Date.now() + 20000; setDisconnecting(true) }
        setStatus({ state: 'loading' }); wasConnected.current = false; fetchStatus()
      }
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return <Card><CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</CardContent></Card>
  }

  if (status.state === 'connected') {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold">WhatsApp conectado</p>
            <p className="text-sm text-muted-foreground mt-1">El asistente de {businessName} ya contesta los mensajes que lleguen a este número.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button onClick={() => act('test')} disabled={busy}><Send className="h-4 w-4 mr-2" /> Enviar mensaje de prueba</Button>
            <Button variant="outline" disabled={busy} onClick={() => { if (window.confirm('¿Desconectar este WhatsApp? El asistente dejará de contestar hasta que lo vuelvas a conectar.')) act('disconnect') }}>
              <Unplug className="h-4 w-4 mr-2" /> Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status.state === 'pending') {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="font-semibold">Estamos preparando tu línea</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Tu número de WhatsApp para el asistente aún se está asignando. Esta pantalla se actualiza sola en cuanto esté listo.</p>
        </CardContent>
      </Card>
    )
  }

  if (status.state === 'qr') {
    return (
      <Card>
        <CardContent className="py-6 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
          <ol className="space-y-3">
            {STEPS.map((text, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{i + 1}</span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
            <li className="text-xs text-muted-foreground pl-9">Usa el número de WhatsApp que quieres que atienda el asistente. El código se renueva solo.</li>
          </ol>
          <div className="mx-auto h-64 w-64 rounded-xl bg-white p-3 flex items-center justify-center">
            {status.qr
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={status.qr} alt="Código QR para vincular WhatsApp" className="h-full w-full object-contain" />
              : <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />}
          </div>
        </CardContent>
      </Card>
    )
  }

  // loading / disconnected / unknown
  const label = disconnecting ? 'Desconectando…' : null
  const needsRestart = !disconnecting && (status.state === 'disconnected' || status.state === 'unknown')
  return (
    <Card>
      <CardContent className="py-10 text-center space-y-3">
        {needsRestart ? null : <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />}
        <p className="font-semibold">{label ?? (needsRestart ? 'No pudimos mostrar el código' : 'Preparando tu conexión…')}</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {needsRestart ? 'Reinicia la conexión para generar un código nuevo.' : 'En unos segundos aparece el código para escanear.'}
        </p>
        {needsRestart && (
          <Button variant="outline" disabled={busy} onClick={() => act('restart')}><RefreshCw className="h-4 w-4 mr-2" /> Reiniciar conexión</Button>
        )}
      </CardContent>
    </Card>
  )
}
