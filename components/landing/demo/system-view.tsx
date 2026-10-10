'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Sparkles, Check, Clock, DollarSign, MessageSquare, Settings, ShoppingBag, Smartphone, Tag, UserRound, Users, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getProfile } from '@/lib/profiles/registry'
import { customerLabel } from '@/lib/business-type'
import type { DemoPlan } from '@/lib/demo/types'
import { BrowserFrame, Photo, money, slugify } from './shared'

const ICONS: Record<string, LucideIcon> = {
  setup: Sparkles,
  appointments: CalendarDays, patients: Users, staff: UserRound, services: Tag, schedule: Clock, conversations: MessageSquare,
  whatsapp: Smartphone, finanzas: DollarSign, analytics: BarChart3, settings: Settings, orders: ShoppingBag, menu: UtensilsCrossed,
}
const STEP_MS = 3600

interface Mod { id: string; href: string; title: string }

function Row({ i, children }: { i: number; children: React.ReactNode }) {
  return <div style={{ animation: `qt-fade-up .45s ease-out ${i * 90}ms both` }}>{children}</div>
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

function Kpi({ label, value, color, c }: { label: string; value: string; color: string; c: Palette }) {
  return (
    <div className="flex-1 rounded-lg border px-3 py-2.5" style={{ background: c.soft, borderColor: c.border }}>
      <p className="text-[9.5px] uppercase tracking-wider" style={{ color: c.muted }}>{label}</p>
      <p className="mt-0.5 text-base font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
type Palette = { text: string; muted: string; border: string; soft: string; bg: string; side: string }

function Content({ mod, plan, c }: { mod: Mod; plan: DemoPlan; c: Palette }) {
  const accent = plan.accent
  const income = plan.agenda.reduce((sum, a) => sum + (plan.services.find(s => s.name === a.service)?.price ?? plan.services[0].price), 0)
  const clients = [...new Set(plan.agenda.map(a => a.client))]
  const week = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const bars = week.map((d, i) => 30 + (hash(plan.businessName + d + i) % 70))

  switch (mod.id) {
    case 'appointments':
    case 'orders':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Kpi label={mod.id === 'orders' ? 'Pedidos' : 'Citas'} value={String(plan.agenda.length + 8)} color={accent} c={c} />
            <Kpi label={mod.id === 'orders' ? 'Pagados' : 'Confirmadas'} value={String(plan.agenda.length + 5)} color="#10b981" c={c} />
            <Kpi label="Ingresos" value={money(income + 1800)} color="#3b82f6" c={c} />
          </div>
          <div className="space-y-1.5">
            {plan.agenda.slice(0, 4).map((a, i) => (
              <Row key={i} i={i}>
                <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: `${accent}${i % 2 ? '12' : '1c'}`, borderLeft: `3px solid ${accent}` }}>
                  <span className="w-11 text-xs font-semibold tabular-nums" style={{ color: c.text }}>{a.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" style={{ color: c.text }}>{a.service}</p>
                    <p className="truncate text-[10px]" style={{ color: c.muted }}>{a.client}{a.staff ? ` · ${a.staff}` : ''}</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: '#10b98122', color: '#10b981' }}>{mod.id === 'orders' ? (i === 0 ? 'En cocina' : 'Nuevo') : 'Confirmada'}</span>
                </div>
              </Row>
            ))}
          </div>
        </div>
      )
    case 'setup':
      return (
        <div className="space-y-2.5">
          <Row i={0}><div className="max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed" style={{ background: c.soft, color: c.text }}>Armé {plan.services.length} servicios con lo que me contaste. ¿Los precios están bien o los ajustamos?</div></Row>
          <Row i={1}><div className="ml-auto max-w-[80%] rounded-2xl px-3 py-2 text-xs" style={{ background: plan.accent, color: '#fff' }}>Están bien, publícalos</div></Row>
          <Row i={2}><div className="max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed" style={{ background: c.soft, color: c.text }}>Listo, tu página de reservas ya está publicada. ¿Seguimos con tus horarios?</div></Row>
          <Row i={3}><p className="flex items-center gap-1.5 text-[11px]" style={{ color: '#10b981' }}><Check size={12} /> {plan.services.length} servicios publicados</p></Row>
        </div>
      )
    case 'patients':
      return (
        <div className="space-y-1.5">
          {clients.slice(0, 5).map((n, i) => (
            <Row key={n} i={i}>
              <div className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: c.border, background: c.soft }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${accent}22`, color: accent }}>{n.charAt(0)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" style={{ color: c.text }}>{n}</p><p className="text-[10px]" style={{ color: c.muted }}>Cliente por WhatsApp</p></div>
                <span className="text-[10px]" style={{ color: c.muted }}>{i === 0 ? 'Hoy' : `hace ${i + 1} sem`}</span>
              </div>
            </Row>
          ))}
        </div>
      )
    case 'staff':
      return (
        <div className="grid grid-cols-2 gap-2">
          {(plan.staff.length ? plan.staff : ['Equipo']).slice(0, 4).map((n, i) => (
            <Row key={n} i={i}>
              <div className="rounded-xl border p-3 text-center" style={{ borderColor: c.border, background: c.soft }}>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${accent}22`, color: accent }}>{n.charAt(0)}</span>
                <p className="mt-2 text-xs font-semibold" style={{ color: c.text }}>{n}</p>
                <p className="text-[10px]" style={{ color: c.muted }}>{plan.staffLabel} · agenda propia</p>
              </div>
            </Row>
          ))}
        </div>
      )
    case 'services':
    case 'menu':
      return (
        <div className="space-y-1.5">
          {plan.services.slice(0, 4).map((s, i) => (
            <Row key={s.name} i={i}>
              <div className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: c.border, background: c.soft }}>
                <Photo photo={s.photo} accent={accent} className="h-10 w-10 shrink-0 rounded-md">{!s.photo && <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/90">{s.name.charAt(0)}</span>}</Photo>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" style={{ color: c.text }}>{s.name}</p><p className="text-[10px]" style={{ color: c.muted }}>{s.durationMin > 0 ? `${s.durationMin} min` : 'Platillo'}</p></div>
                <span className="text-xs font-semibold" style={{ color: c.text }}>{money(s.price)}</span>
              </div>
            </Row>
          ))}
        </div>
      )
    case 'schedule':
      return (
        <div className="space-y-1">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d, i) => (
            <Row key={d} i={i}>
              <div className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs" style={{ background: c.soft, color: c.text }}>
                <span>{d}</span><span style={{ color: i === 5 ? c.muted : accent }}>{i === 5 ? '10:00 – 15:00' : '10:00 – 19:00'}</span>
              </div>
            </Row>
          ))}
        </div>
      )
    case 'conversations':
      return (
        <div className="space-y-1.5">
          {clients.slice(0, 4).map((n, i) => (
            <Row key={n} i={i}>
              <div className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: c.border, background: c.soft }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#25d36622', color: '#25d366' }}>{n.charAt(0)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" style={{ color: c.text }}>{n}</p><p className="truncate text-[10px]" style={{ color: c.muted }}>{i === 0 ? (plan.chat[1]?.text.split('\n')[0] ?? 'Cita agendada') : 'Cita agendada por el asistente'}</p></div>
                {i === 0 && <span className="h-2 w-2 rounded-full" style={{ background: '#25d366' }} />}
              </div>
            </Row>
          ))}
        </div>
      )
    case 'whatsapp':
      return (
        <div className="space-y-3">
          <Row i={0}>
            <div className="flex items-center gap-3 rounded-xl border p-4" style={{ borderColor: '#25d36655', background: '#25d3660f' }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: '#25d366', color: '#fff' }}><Check size={20} /></span>
              <div><p className="text-sm font-semibold" style={{ color: c.text }}>WhatsApp conectado</p><p className="text-[11px]" style={{ color: c.muted }}>Escaneas un QR y listo</p></div>
            </div>
          </Row>
          <Row i={1}><div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs" style={{ background: c.soft, color: c.text }}><span>Asistente contesta y agenda</span><span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: '#10b98122', color: '#10b981' }}>Activo</span></div></Row>
          <Row i={2}><div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs" style={{ background: c.soft, color: c.text }}><span>Recordatorios automáticos</span><span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: '#10b98122', color: '#10b981' }}>Activo</span></div></Row>
        </div>
      )
    case 'finanzas':
    case 'analytics':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Kpi label={mod.id === 'finanzas' ? 'Ingresos del mes' : 'Reservas del mes'} value={mod.id === 'finanzas' ? money(income * 14) : String(plan.agenda.length * 14)} color={accent} c={c} />
            <Kpi label={mod.id === 'finanzas' ? 'Anticipos' : 'Por WhatsApp'} value={mod.id === 'finanzas' ? money(Math.round(income * 1.5)) : '82%'} color="#10b981" c={c} />
          </div>
          <div className="flex h-32 items-end gap-2 rounded-xl border p-3" style={{ borderColor: c.border, background: c.soft }}>
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: accent, opacity: 0.55 + (i % 3) * 0.15, transformOrigin: 'bottom', animation: `qt-fade-up .5s ease-out ${i * 70}ms both` }} />
                <span className="text-[9px]" style={{ color: c.muted }}>{week[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return (
        <div className="space-y-1.5">
          {[['Nombre del negocio', plan.businessName], ['Link de reservas', `quickturno.app/book/${slugify(plan.businessName)}`], ['Color de marca', accent], ['Anticipo con Stripe', 'Opcional']].map(([k, v], i) => (
            <Row key={k} i={i}>
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs" style={{ background: c.soft, color: c.text }}>
                <span style={{ color: c.muted }}>{k}</span>
                <span className="flex items-center gap-1.5 truncate font-medium">{k === 'Color de marca' && <span className="h-3.5 w-3.5 rounded" style={{ background: v }} />}{v}</span>
              </div>
            </Row>
          ))}
        </div>
      )
  }
}

export function SystemView({ plan, isDay }: { plan: DemoPlan; isDay: boolean }) {
  const mods = useMemo<Mod[]>(() => {
    const p = getProfile(plan.segment)
    return p.modules.map(m => ({
      id: m.id, href: m.href,
      title: m.title ?? (m.id === 'patients' ? customerLabel(plan.segment, true) : m.id === 'staff' ? p.staffLabel.plural : m.id),
    }))
  }, [plan.segment])
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setI(n => (n + 1) % mods.length), STEP_MS)
    return () => clearTimeout(id)
  }, [i, mods.length])

  const c: Palette = isDay
    ? { text: '#111', muted: '#8a8a8a', border: '#e0ddd8', soft: '#faf9f6', bg: '#ffffff', side: '#faf9f6' }
    : { text: '#ebebeb', muted: '#7a7a7a', border: '#1f1f1f', soft: '#161616', bg: '#111111', side: '#0c0c0c' }
  const mod = mods[i]

  return (
    <BrowserFrame url={`app.quickturno.app${mod.href}`} isDay={isDay}>
      <div className="flex min-h-[430px]" style={{ background: c.bg }}>
        <nav className="flex w-12 shrink-0 flex-col gap-1 border-r p-2 sm:w-44" style={{ background: c.side, borderColor: c.border }}>
          <p className="mb-2 hidden truncate px-2 pt-1 text-xs font-bold sm:block" style={{ color: c.text }}>{plan.businessName}</p>
          {mods.map((m, idx) => {
            const Icon = ICONS[m.id] ?? Settings
            const active = idx === i
            return (
              <button key={m.id} type="button" onClick={() => setI(idx)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors duration-300"
                style={{ background: active ? `${plan.accent}22` : 'transparent', color: active ? plan.accent : c.muted, fontWeight: active ? 600 : 400 }} aria-current={active}>
                <Icon size={15} className="shrink-0" /><span className="hidden truncate sm:inline">{m.title}</span>
              </button>
            )
          })}
        </nav>
        <div className="relative min-w-0 flex-1 p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" style={{ background: c.border }}>
            <div key={i} className="qt-anim h-full origin-left" style={{ background: plan.accent, animation: `qt-progress ${STEP_MS}ms linear both` }} />
          </div>
          <p key={`h${i}`} className="mb-3 text-sm font-semibold" style={{ color: c.text, animation: 'qt-fade-up .35s ease-out both' }}>{mod.title}</p>
          <div key={`c${i}`}><Content mod={mod} plan={plan} c={c} /></div>
        </div>
      </div>
    </BrowserFrame>
  )
}
