'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUp, Check, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { TypedText } from '@/components/landing/demo/motion'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { readDemoHandoff, clearDemoHandoff } from '@/lib/demo/handoff'
import type { SetupStep } from '@/lib/setup/progress'

interface Msg { role: 'user' | 'assistant'; content: string; changes?: string[]; fresh?: boolean }

const KICKOFF = 'Hola, ayúdame a dejar listo mi negocio.'
const STORE = 'qt-setup-chat'
const GRAD = 'linear-gradient(135deg,#7c3aed,#ec4899)'

const CSS = `
@keyframes qt-flow { to { background-position: 200% 0 } }
@keyframes qt-glow { 0%,100% { opacity:.35; transform:scale(.92) } 50% { opacity:.75; transform:scale(1.12) } }
@keyframes qt-orbit { to { transform: rotate(360deg) } }
@keyframes qt-rise { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
@keyframes qt-spark { 0%,100% { transform: rotate(0) scale(1) } 50% { transform: rotate(18deg) scale(1.2) } }
@media (prefers-reduced-motion: reduce) { .qt-m { animation: none !important } }
`

/** Orbe del asistente: el logo de QuickTurno con halo y un punto que orbita. */
function Orb({ size = 64, busy = false }: { size?: number; busy?: boolean }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className="qt-m absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle,#c026d388,transparent 68%)', animation: `qt-glow ${busy ? 1.2 : 2.8}s ease-in-out infinite` }} />
      <span className="qt-m absolute inset-[3px]" style={{ animation: `qt-orbit ${busy ? 1.4 : 5}s linear infinite` }}>
        <span className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: '#f0abfc', boxShadow: '0 0 10px #e879f9' }} />
      </span>
      <span className="relative flex items-center justify-center rounded-full" style={{ width: size * 0.74, height: size * 0.74, background: GRAD }}>
        <TurnoLogo height={Math.round(size * 0.3)} variant="dark" />
      </span>
    </span>
  )
}

export function SetupChat({ orgName, slug, usesAgenda, drafts, steps }: { orgName: string; slug: string; usesAgenda: boolean; drafts: number; steps: SetupStep[] }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const done = steps.filter(s => s.done).length
  const pct = Math.round((done / Math.max(steps.length, 1)) * 100)

  const send = useCallback(async (text: string, hidden = false, base?: Msg[]) => {
    const history: Msg[] = [...(base ?? []), { role: 'user', content: text }]
    setMessages(hidden ? (base ?? []) : history)
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/setup-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No pude responder.')
      setMessages([...(hidden ? [] : history), { role: 'assistant', content: data.reply, changes: data.changes, fresh: true }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude responder.')
    } finally {
      setBusy(false)
    }
  }, [])

  // Al entrar: recupera la conversación de esta sesión o arranca con el repaso del negocio
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null') as Msg[] | null
        if (saved?.length) { setMessages(saved.map(m => ({ ...m, fresh: false }))); return }
      } catch { /* sin almacenamiento */ }
      // Si llegó desde la demo de la landing con una cuenta que ya existía, la IA arranca con lo que armó ahí
      const demo = readDemoHandoff()
      if (demo) {
        const d = demo.plan
        clearDemoHandoff()
        send(`${KICKOFF} Armé una demo en la página y quiero usarla como base: negocio "${d.businessName}", color ${d.accent}, servicios: ${d.services.map(s => `${s.name} $${s.price}${s.durationMin ? ` (${s.durationMin} min)` : ''}`).join('; ')}. Revísala conmigo antes de publicar nada.`, true)
        return
      }
      send(KICKOFF, true)
    }, 0)
    return () => clearTimeout(id)
  }, [send])

  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.map(m => ({ ...m, fresh: false })))) } catch { /* nada */ } }, [messages])
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])

  const submit = (text = input) => { const t = text.trim(); if (!t || busy) return; setInput(''); send(t, false, messages.map(m => ({ ...m, fresh: false }))) }

  const suggestions = drafts > 0
    ? ['Los precios están bien, publica mis servicios', 'Quiero cambiar algunos precios', 'Agrega un servicio nuevo']
    : usesAgenda ? ['Quiero agregar mis servicios', 'Configura mi horario', 'Agrega a mi equipo'] : ['Actualiza la dirección de mi negocio', 'Escribe el mensaje de bienvenida de mi bot']

  return (
    <div className="space-y-5">
      <style>{CSS}</style>

      {/* Encabezado: orbe, mensaje y avance real */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 p-5 sm:p-6" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.18),rgba(236,72,153,.12) 60%,transparent)' }}>
        <div className="qt-m pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle,rgba(217,70,239,.35),transparent 65%)', animation: 'qt-glow 5s ease-in-out infinite' }} />
        <div className="relative flex flex-wrap items-center gap-5">
          <Orb size={72} busy={busy} />
          <div className="min-w-[220px] flex-1">
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: GRAD }}><Sparkles size={11} style={{ animation: 'qt-spark 2.4s ease-in-out infinite' }} /> Asistente con IA</p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{pct === 100 ? 'Tu negocio está listo' : `Armemos ${orgName} juntos`}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{pct === 100 ? 'Ya completaste todo lo básico. Puedes pedirme ajustes cuando quieras.' : 'Platica con la IA y ella aplica los cambios por ti: servicios, equipo, horarios y tu página de reservas.'}</p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1.5 flex items-baseline justify-between"><span className="text-xs text-muted-foreground">{done} de {steps.length} pasos</span><span className="text-lg font-bold tabular-nums">{pct}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: GRAD }} /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Chat con borde de color que fluye */}
        <div className="qt-m rounded-2xl p-[1.5px]" style={{ background: 'linear-gradient(120deg,#7c3aed,#ec4899,#7c3aed)', backgroundSize: '200% 100%', animation: 'qt-flow 7s linear infinite' }}>
          <div className="flex h-[620px] flex-col overflow-hidden rounded-[15px] bg-card">
            <div ref={box} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'qt-rise .35s ease-out both' }}>
                  {m.role === 'assistant' && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: GRAD }}><Sparkles size={14} /></span>}
                  <div className="max-w-[85%] space-y-2">
                    <div className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'text-white' : 'border border-border bg-muted/60'}`} style={m.role === 'user' ? { background: GRAD } : undefined}>
                      {m.role === 'assistant' && m.fresh ? <TypedText text={m.content} speed={10} caret /> : m.content}
                    </div>
                    {m.changes && m.changes.length > 0 && (
                      <ul className="space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        {m.changes.map((c, k) => <li key={k} className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400" style={{ animation: `qt-rise .3s ease-out ${k * 90}ms both` }}><Check size={13} className="mt-0.5 shrink-0" />{c}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: GRAD }}><Loader2 size={14} className="animate-spin" /></span>
                  <div className="rounded-2xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">Pensando…</div>
                </div>
              )}
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            </div>

            <div className="border-t border-border p-3 sm:p-4">
              {!busy && messages.length > 0 && messages.length < 4 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button key={s} type="button" onClick={() => submit(s)} className="group inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10">
                      {s}<ArrowRight size={12} className="opacity-50 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={e => { e.preventDefault(); submit() }} className="flex items-end gap-2">
                <textarea value={input} onChange={e => setInput(e.target.value)} rows={1} maxLength={1000} disabled={busy}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder="Escribe aquí… por ejemplo: el corte cuesta $200 y dura 30 minutos"
                  className="max-h-28 min-h-[46px] flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none transition-colors focus:border-fuchsia-500 disabled:opacity-60" />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100" style={{ background: GRAD }}><ArrowUp size={19} /></button>
              </form>
            </div>
          </div>
        </div>

        {/* Pasos de configuración con su avance */}
        <aside className="space-y-2.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu avance</p>
          {steps.map(st => (
            <Link key={st.id} href={st.href} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted ${st.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={st.done ? { background: '#10b981', color: '#fff' } : { border: '1.5px dashed #a78bfa', color: '#a78bfa' }}>{st.done ? <Check size={14} /> : '·'}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{st.label}</span><span className="block truncate text-xs text-muted-foreground">{st.detail}</span></span>
            </Link>
          ))}
          {usesAgenda && (
            <a href={`/book/${slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl p-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]" style={{ background: GRAD }}>
              <span><span className="block">Ver mi página de reservas</span><span className="text-xs font-normal opacity-80">/book/{slug}</span></span><ExternalLink size={16} />
            </a>
          )}
          <p className="px-1 text-xs text-muted-foreground">La IA aplica los cambios por ti. El logo y las fotos se suben desde Configuración y Servicios.</p>
        </aside>
      </div>
    </div>
  )
}
