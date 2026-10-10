'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface ProspectRow {
  id: string; name: string; contact_name: string | null; phone: string; segment: string; city: string | null
  status: string; followups_sent: number; handoff_reason: string | null; offer_link: string | null
  last_contact_at: string | null; last_inbound_at: string | null; created_at: string
}
export interface ConfigView {
  enabled: boolean; lineReady: boolean; lineName: string | null; owner_phone: string
  daily_limit: number; send_start_hour: number; send_end_hour: number; max_followups: number; followup_after_days: number
}
interface Msg { id: string; role: 'user' | 'assistant'; kind: string; content: string; created_at: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Por contactar', cls: 'bg-zinc-500/15 text-zinc-400' },
  contacted: { label: 'Contactado', cls: 'bg-blue-500/15 text-blue-400' },
  replied: { label: 'Contestó', cls: 'bg-violet-500/15 text-violet-400' },
  interested: { label: 'Interesado', cls: 'bg-emerald-500/15 text-emerald-400' },
  negotiating: { label: 'Negociando', cls: 'bg-amber-500/15 text-amber-400' },
  handoff: { label: 'Te necesita', cls: 'bg-red-500/15 text-red-400' },
  won: { label: 'Cliente', cls: 'bg-emerald-500/25 text-emerald-300' },
  lost: { label: 'Perdido', cls: 'bg-zinc-500/15 text-zinc-500' },
  opted_out: { label: 'No escribir', cls: 'bg-zinc-500/15 text-zinc-500' },
  invalid: { label: 'Sin WhatsApp', cls: 'bg-zinc-500/15 text-zinc-500' },
}
const input = 'h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary'
const btn = 'h-9 rounded-md px-4 text-sm font-medium disabled:opacity-50'

async function post(url: string, body: unknown, method = 'POST') {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { ok: res.ok, data: await res.json().catch(() => null) }
}

export function SalesPanel({ config, prospects, sentToday, orgs, freeInstances }: { config: ConfigView; prospects: ProspectRow[]; sentToday: number; orgs: { slug: string; name: string }[]; freeInstances: string[] }) {
  const router = useRouter()
  const [cfg, setCfg] = useState(config)
  const [lineChoice, setLineChoice] = useState('')   // 'pool:instance123' | 'org:slug'
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [filter, setFilter] = useState('all')

  const count = (s: string) => prospects.filter(p => p.status === s).length
  const shown = filter === 'all' ? prospects : prospects.filter(p => p.status === filter)

  async function saveConfig(extra: Record<string, unknown> = {}) {
    setSaving(true)
    const { ok, data } = await post('/api/admin/sales/config', {
      owner_phone: cfg.owner_phone, daily_limit: cfg.daily_limit, send_start_hour: cfg.send_start_hour, send_end_hour: cfg.send_end_hour,
      max_followups: cfg.max_followups, followup_after_days: cfg.followup_after_days, ...extra,
    })
    setSaving(false)
    if (!ok) return toast.error(data?.error ?? 'No se pudo guardar')
    toast.success('Guardado')
    router.refresh()
  }

  async function changeLine() {
    if (!lineChoice) return
    const [source, value] = lineChoice.split(':')
    const msg = source === 'org'
      ? 'La instancia se MOVERÁ de ese negocio a ventas: el negocio se queda sin línea (el número sigue conectado y pasa a ser el de ventas). ¿Continuar?'
      : 'Esta instancia quedará apartada para ventas y no se le asignará a ningún negocio. ¿Continuar?'
    if (!window.confirm(msg)) return
    await saveConfig({ line: { source, value } })
    setLineChoice('')
  }

  async function removeLine() {
    if (!window.confirm('Se apaga el agente, se cierra la sesión de WhatsApp de esa línea y la instancia vuelve a la reserva. ¿Continuar?')) return
    await saveConfig({ clearLine: true })
  }

  async function toggle() {
    if (!cfg.enabled && !window.confirm('Vas a encender el agente. A partir de la próxima hora empezará a escribirles a los prospectos pendientes, dentro de tu horario y tu tope diario. ¿Continuar?')) return
    const { ok, data } = await post('/api/admin/sales/config', {
      owner_phone: cfg.owner_phone, daily_limit: cfg.daily_limit, send_start_hour: cfg.send_start_hour, send_end_hour: cfg.send_end_hour,
      max_followups: cfg.max_followups, followup_after_days: cfg.followup_after_days, enabled: !cfg.enabled,
    })
    if (!ok) return toast.error(data?.error ?? 'No se pudo cambiar')
    setCfg(c => ({ ...c, enabled: !c.enabled }))
    router.refresh()
  }

  async function importList() {
    setImporting(true)
    const { ok, data } = await post('/api/admin/sales/prospects', { text })
    setImporting(false)
    if (!ok) return toast.error(data?.error ?? 'No se pudo importar')
    toast.success(`${data.added} agregados${data.duplicated ? `, ${data.duplicated} repetidos` : ''}${data.invalid?.length ? `, ${data.invalid.length} con datos no válidos` : ''}`)
    if (data.invalid?.length) console.warn('Líneas no válidas:', data.invalid)
    setText('')
    router.refresh()
  }

  async function importNotion() {
    setImporting(true)
    const { ok, data } = await post('/api/admin/sales/notion', {})
    setImporting(false)
    if (!ok) return toast.error(data?.error ?? 'No se pudo leer Notion')
    toast.success(`${data.added} agregados desde Notion${data.duplicated ? `, ${data.duplicated} repetidos` : ''}${data.skippedNoPhone ? `, ${data.skippedNoPhone} sin teléfono` : ''}`)
    router.refresh()
  }

  async function syncNotion() {
    setImporting(true)
    const { ok, data } = await post('/api/admin/sales/notion', {}, 'PUT')
    setImporting(false)
    if (!ok) return toast.error(data?.error ?? 'No se pudo escribir en Notion')
    toast.success(`${data.updated} actualizados en Notion${data.failed ? `, ${data.failed} con error (¿la integración puede editar?)` : ''}`)
  }

  async function setStatus(id: string, status: string) {
    const { ok, data } = await post('/api/admin/sales/prospects', { id, status }, 'PATCH')
    if (!ok) return toast.error(data?.error ?? 'No se pudo cambiar')
    router.refresh()
  }

  async function toggleOpen(id: string) {
    if (open === id) { setOpen(null); return }
    setOpen(id); setMessages([])
    const res = await fetch(`/api/admin/sales/messages?prospect=${id}`)
    const data = await res.json().catch(() => null)
    setMessages(data?.messages ?? [])
  }

  const num = (k: keyof ConfigView) => (
    <input type="number" className={`${input} w-20`} value={String(cfg[k])} onChange={e => setCfg(c => ({ ...c, [k]: Number(e.target.value) }))} />
  )

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Agente de ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">Escribe a los negocios que cargues, se presenta, resuelve dudas y negocia dentro de límites fijos.</p>
        </div>
        <button onClick={toggle} className={`${btn} ${cfg.enabled ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {cfg.enabled ? 'Apagar agente' : 'Encender agente'}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[
          [`${sentToday}/${cfg.daily_limit}`, 'enviados hoy'],
          [String(count('new')), 'por contactar'],
          [String(count('contacted')), 'sin respuesta'],
          [String(count('replied') + count('interested') + count('negotiating')), 'conversando'],
          [String(count('handoff')), 'te necesitan'],
          [String(count('won')), 'clientes'],
        ].map(([v, l]) => (
          <div key={l} className={`rounded-lg border px-4 py-3 ${l === 'te necesitan' && v !== '0' ? 'border-red-500/60' : 'border-border'}`}>
            <p className="text-2xl font-semibold">{v}</p><p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      {/* Configuración */}
      <section className="rounded-lg border border-border p-4 space-y-4">
        <p className="text-sm font-semibold">Configuración</p>
        <LineSection
          ready={cfg.lineReady}
          name={cfg.lineName}
          freeInstances={freeInstances}
          orgs={orgs}
          choice={lineChoice}
          onChoice={setLineChoice}
          onChange={changeLine}
          onRemove={removeLine}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-3 items-center text-sm">
          <label className="flex items-center gap-2">Tu teléfono de aviso <input className={`${input} w-40`} placeholder="10 dígitos" value={cfg.owner_phone} onChange={e => setCfg(c => ({ ...c, owner_phone: e.target.value }))} /></label>
          <label className="flex items-center gap-2">Tope diario {num('daily_limit')}</label>
          <label className="flex items-center gap-2">De {num('send_start_hour')} a {num('send_end_hour')} h</label>
          <label className="flex items-center gap-2">Seguimientos {num('max_followups')}</label>
          <label className="flex items-center gap-2">cada {num('followup_after_days')} días</label>
        </div>
        <button onClick={() => saveConfig()} disabled={saving} className={`${btn} bg-violet-600 text-white`}>{saving ? 'Guardando…' : 'Guardar configuración'}</button>
        <p className="text-xs text-muted-foreground">Nunca escribe domingos ni fuera de horario. Manda máximo 3 mensajes por hora, con pausas entre ellos.</p>
      </section>

      {/* Importar */}
      <section className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-semibold">Cargar negocios</p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-border bg-background p-3 text-sm font-mono outline-none focus:border-primary"
          placeholder={'Una línea por negocio: Nombre, Teléfono, Giro, Ciudad, Contacto\nBarbería El Estilo, 624 123 4567, barbería, Cabo San Lucas, Luis\nTours Mar Azul, 624 765 4321, tours, San José del Cabo'}
          value={text} onChange={e => setText(e.target.value)}
        />
        <button onClick={importList} disabled={importing || !text.trim()} className={`${btn} bg-violet-600 text-white`}>{importing ? 'Importando…' : 'Importar'}</button>
        <button onClick={importNotion} disabled={importing} className={`${btn} bg-muted text-foreground ml-2`}>Importar desde Notion</button>
        <button onClick={syncNotion} disabled={importing} className={`${btn} bg-muted text-foreground ml-2`}>Enviar avance a Notion</button>
        <p className="text-xs text-muted-foreground">Giro, ciudad y contacto son opcionales. Los teléfonos repetidos se omiten. «Importar desde Notion» trae los que están en estado «Por contactar» del CRM.</p>
      </section>

      {/* Lista */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold">Prospectos ({shown.length})</p>
          <select className={input} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay prospectos con ese filtro.</p>
        ) : (
          <ul className="rounded-lg border border-border divide-y divide-border">
            {shown.map(p => {
              const st = STATUS[p.status] ?? { label: p.status, cls: '' }
              return (
                <li key={p.id} className="text-sm">
                  <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
                    <button onClick={() => toggleOpen(p.id)} className="flex-1 min-w-[200px] text-left">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground"> · {p.phone.slice(-10)}{p.city ? ` · ${p.city}` : ''}</span>
                      {p.handoff_reason && <span className="block text-xs text-red-400">{p.handoff_reason}</span>}
                    </button>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value="" onChange={e => e.target.value && setStatus(p.id, e.target.value)}>
                      <option value="">Cambiar…</option>
                      <option value="new">Reabrir (por contactar)</option>
                      <option value="lost">Marcar perdido</option>
                      <option value="won">Marcar cliente</option>
                      <option value="opted_out">No escribir más</option>
                    </select>
                  </div>
                  {open === p.id && (
                    <div className="px-4 pb-3 space-y-1.5 bg-muted/20">
                      {messages.length === 0 ? <p className="text-xs text-muted-foreground py-2">Sin mensajes todavía.</p> : messages.map(m => (
                        <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs whitespace-pre-wrap ${m.role === 'user' ? 'bg-muted' : 'bg-violet-600/20 ml-auto'}`}>{m.content}</div>
                      ))}
                      {p.offer_link && <p className="text-xs text-muted-foreground break-all pt-1">Enlace con descuento dado: {p.offer_link}</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

interface LineState { state: string; qr?: string | null; instance?: string }

/** Línea de WhatsApp de ventas: su estado en vivo, el QR para vincularla y cómo cambiarla. */
function LineSection({ ready, name, freeInstances, orgs, choice, onChoice, onChange, onRemove }: {
  ready: boolean; name: string | null; freeInstances: string[]; orgs: { slug: string; name: string }[]
  choice: string; onChoice: (v: string) => void; onChange: () => void; onRemove: () => void
}) {
  const router = useRouter()
  const [line, setLine] = useState<LineState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ready) return
    let stopped = false, timer: ReturnType<typeof setTimeout>, first = true
    const tick = async () => {
      if (stopped) return
      if (first || document.visibilityState === 'visible') {
        const res = await fetch('/api/admin/sales/line', { cache: 'no-store' }).catch(() => null)
        if (res?.ok && !stopped) setLine(await res.json())
      }
      first = false
      if (!stopped) timer = setTimeout(tick, 4000)
    }
    tick()
    return () => { stopped = true; clearTimeout(timer) }
  }, [ready, name])

  async function act(action: 'logout' | 'restart' | 'test') {
    setBusy(true)
    const { ok, data } = await post('/api/admin/sales/line', { action })
    setBusy(false)
    if (!ok) return toast.error(data?.error ?? 'No se pudo completar')
    toast.success(action === 'test' ? 'Mensaje de prueba enviado a tu teléfono' : 'Listo')
    if (action !== 'test') { setLine({ state: 'loading' }); router.refresh() }
  }

  const label: Record<string, string> = { connected: 'conectada', qr: 'falta vincular el teléfono', loading: 'iniciando…', disconnected: 'desconectada', unknown: 'sin respuesta de UltraMsg', none: 'sin elegir' }
  const connected = line?.state === 'connected'

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Línea de WhatsApp de ventas:{' '}
        {ready
          ? <span className={connected ? 'text-emerald-500' : 'text-amber-500'}>{name} · {line ? (label[line.state] ?? line.state) : 'revisando…'}</span>
          : <span className="text-amber-500">sin elegir</span>}
      </p>

      {ready && line?.state === 'qr' && (
        <div className="flex gap-4 items-center flex-wrap rounded-md border border-border p-3">
          <div className="h-40 w-40 rounded-lg bg-white p-2 flex items-center justify-center">
            {line.qr
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={line.qr} alt="Código QR de la línea de ventas" className="h-full w-full object-contain" />
              : <span className="text-xs text-zinc-500">Cargando…</span>}
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">En el teléfono de ventas abre WhatsApp, Ajustes, Dispositivos vinculados, Vincular un dispositivo y escanea este código.</p>
        </div>
      )}

      {ready && (
        <div className="flex gap-2 flex-wrap">
          <button disabled={busy || !connected} onClick={() => act('test')} className={`${btn} bg-muted text-foreground`}>Enviarme un mensaje de prueba</button>
          <button disabled={busy} onClick={() => act('restart')} className={`${btn} bg-muted text-foreground`}>Reiniciar</button>
          <button disabled={busy} onClick={onRemove} className={`${btn} bg-muted text-red-400`}>Quitar línea</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <select className={`${input} min-w-[260px]`} value={choice} onChange={e => onChoice(e.target.value)}>
          <option value="">{ready ? 'Cambiar de línea…' : 'Elegir línea…'}</option>
          {freeInstances.length > 0 && (
            <optgroup label="Instancias libres de la reserva">
              {freeInstances.map(i => <option key={i} value={`pool:${i}`}>{i}</option>)}
            </optgroup>
          )}
          {orgs.length > 0 && (
            <optgroup label="Mover desde un negocio (se la quita)">
              {orgs.map(o => <option key={o.slug} value={`org:${o.slug}`}>{o.name}</option>)}
            </optgroup>
          )}
        </select>
        <button disabled={!choice} onClick={onChange} className={`${btn} bg-violet-600 text-white`}>Usar esta línea</button>
      </div>
      <p className="text-xs text-muted-foreground">La línea de ventas es solo de ventas: no se comparte con ningún negocio. Si le escribes en frío a muchas personas y WhatsApp bloquea el número, solo afecta a ventas.</p>
    </div>
  )
}
