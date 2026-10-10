'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Sparkles, Clock } from 'lucide-react'
import type { Tokens } from './feature-visuals'
import type { DemoPlan, DemoPhoto } from '@/lib/demo/types'

interface Props { t: Tokens; isDay: boolean }

const EXAMPLES = [
  'Barbería con 3 barberos en Cabo San Lucas. Cortes, barba y diseño.',
  'Consultorio dental: limpiezas, ortodoncia y blanqueamiento.',
  'Taquería con servicio a domicilio y para recoger.',
  'Spa con masajes, faciales y paquetes para parejas.',
]
type View = 'reservas' | 'agenda' | 'whatsapp'
const money = (n: number) => `$${n.toLocaleString('es-MX')}`

/** Foto real de la biblioteca o, si no hay, un degradado con el color del negocio (nunca una imagen generada). */
function Photo({ photo, accent, className = '', children }: { photo: DemoPhoto | null; accent: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt={photo.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
      {children}
    </div>
  )
}

function BookingPage({ plan }: { plan: DemoPlan }) {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] shadow-xl" style={{ borderColor: '#1a1a1a', background: '#fff', color: '#111' }}>
      <Photo photo={plan.heroPhoto} accent={plan.accent} className="h-40">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)' }} />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <p className="text-lg font-bold leading-tight">{plan.businessName}</p>
          {plan.tagline && <p className="mt-0.5 text-xs opacity-90">{plan.tagline}</p>}
        </div>
      </Photo>
      <div className="space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Elige tu servicio</p>
        {plan.services.map(s => (
          <div key={s.name} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: '#ececec' }}>
            <Photo photo={s.photo} accent={plan.accent} className="h-14 w-14 shrink-0 rounded-lg">
              {!s.photo && <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/90">{s.name.charAt(0)}</span>}
            </Photo>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="line-clamp-1 text-xs text-neutral-500">{s.description}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{s.durationMin > 0 ? `${s.durationMin} min · ` : ''}<b>{money(s.price)}</b></p>
            </div>
          </div>
        ))}
        <div className="rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: plan.accent }}>Reservar</div>
      </div>
    </div>
  )
}

function AgendaView({ plan, t, isDay }: { plan: DemoPlan; t: Tokens; isDay: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border" style={{ background: t.card, borderColor: t.border }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: t.border, background: isDay ? '#faf9f6' : '#0c0c0c' }}>
        <p className="text-sm font-semibold" style={{ color: t.text }}>Hoy · Agenda</p>
        <p className="text-xs" style={{ color: t.muted }}>{plan.businessName}</p>
      </div>
      <div className="divide-y" style={{ borderColor: t.border }}>
        {plan.agenda.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: t.border }}>
            <span className="h-8 w-1 rounded-full" style={{ background: plan.accent, opacity: i % 2 ? 0.55 : 1 }} />
            <span className="w-12 text-sm font-semibold tabular-nums" style={{ color: t.text }}>{a.time}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm" style={{ color: t.text }}>{a.service}</p>
              <p className="truncate text-xs" style={{ color: t.muted }}>{a.client}{a.staff ? ` · ${plan.staffLabel} ${a.staff}` : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatView({ plan, isDay }: { plan: DemoPlan; isDay: boolean }) {
  const pal = isDay ? { bg: '#efeae2', inb: '#fff', out: '#d9fdd3', text: '#111b21', time: '#667781' } : { bg: '#0b141a', inb: '#1f2c34', out: '#005c4b', text: '#e9edef', time: '#8696a0' }
  return (
    <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border" style={{ borderColor: isDay ? '#e0ddd8' : '#1f1f1f' }}>
      <div className="px-4 py-3 text-sm font-semibold text-white" style={{ background: '#075e54' }}>{plan.businessName}</div>
      <div className="space-y-2 p-3" style={{ background: pal.bg }}>
        {plan.chat.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'bot' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[82%] whitespace-pre-line rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm" style={{ background: m.from === 'bot' ? pal.inb : pal.out, color: pal.text }}>
              {m.text}
              <span className="ml-2 align-bottom text-[10px]" style={{ color: pal.time }}>{m.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DemoGenerator({ t, isDay }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<DemoPlan | null>(null)
  const [view, setView] = useState<View>('reservas')

  async function generate(description = text) {
    if (loading) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No pudimos armar la demo.')
      setPlan(data.plan); setView('reservas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos armar la demo.')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: View; label: string }[] = [{ id: 'reservas', label: 'Tu página de reservas' }, { id: 'agenda', label: 'Tu agenda' }, { id: 'whatsapp', label: 'Tu WhatsApp' }]

  return (
    <section id="demo" style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: t.accent }}><Sparkles size={14} /> Pruébalo con tu negocio</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: t.text, letterSpacing: '-0.03em' }}>Cuéntanos tu negocio y míralo funcionando</h2>
          <p className="mt-3 text-sm sm:text-base" style={{ color: t.muted }}>Escribe qué haces y en segundos armamos cómo se vería tu página de reservas, tu agenda y tu WhatsApp.</p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <textarea
            value={text} onChange={e => setText(e.target.value)} maxLength={600} rows={3}
            placeholder="Ej. Tengo una barbería en Cabo San Lucas con 3 barberos. Hacemos cortes, barba y diseños."
            className="w-full resize-none rounded-2xl border p-4 text-sm outline-none transition-colors focus:border-[#7c3aed]"
            style={{ background: t.card, borderColor: t.border, color: t.text }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} type="button" onClick={() => { setText(ex); generate(ex) }} disabled={loading}
                className="rounded-full border px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-50" style={{ borderColor: t.border, color: t.muted }}>
                {ex.split('.')[0]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => generate()} disabled={loading || text.trim().length < 15}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 sm:w-auto"
            style={{ background: t.accent }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Armando tu demo…</> : <>Crear mi demo <ArrowRight size={16} /></>}
          </button>
          {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
        </div>

        {plan && (
          <div className="mt-12">
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {tabs.map(tab => (
                <button key={tab.id} type="button" onClick={() => setView(tab.id)} className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  style={view === tab.id ? { background: t.accent, color: '#fff' } : { border: `1px solid ${t.border}`, color: t.muted }}>
                  {tab.label}
                </button>
              ))}
            </div>
            {view === 'reservas' && <BookingPage plan={plan} />}
            {view === 'agenda' && <AgendaView plan={plan} t={t} isDay={isDay} />}
            {view === 'whatsapp' && <ChatView plan={plan} isDay={isDay} />}
            <p className="mx-auto mt-6 flex max-w-md items-center justify-center gap-1.5 text-center text-xs" style={{ color: t.muted }}>
              <Clock size={12} /> Datos de ejemplo armados a partir de tu descripción.
            </p>
            <div className="mt-6 text-center">
              <a href={`/register?type=${plan.segment}`} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white" style={{ background: t.accent }}>
                Crear mi cuenta con esto <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
