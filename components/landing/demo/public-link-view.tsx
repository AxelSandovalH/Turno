'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import type { DemoPlan } from '@/lib/demo/types'
import { BrowserFrame, Photo, money, slugify } from './shared'
import { TypedText } from './motion'

// Réplica animada de la página pública de reservas (/book/[slug]): Servicio -> Fecha y hora -> Tus datos -> Listo.
// Etapas: 0 servicios · 1 elige servicio · 2 fecha · 3 elige día · 4 elige hora · 5 escribe nombre · 6 escribe WhatsApp · 7 confirma · 8 listo
const DURATIONS = [1500, 1000, 1100, 1100, 1000, 1700, 1700, 900, 3000]
const SLOTS = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']
const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

function Flow({ plan, onFinish }: { plan: DemoPlan; onFinish: () => void }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => (stage < DURATIONS.length - 1 ? setStage(s => s + 1) : onFinish()), DURATIONS[stage])
    return () => clearTimeout(id)
  }, [stage, onFinish])

  const accent = plan.accent
  const service = plan.services[0]
  const step = stage <= 1 ? 1 : stage <= 4 ? 2 : stage <= 7 ? 3 : 4
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d })
  const pickedDay = days[2]
  const steps = ['Servicio', 'Fecha y hora', 'Tus datos']
  const tap = { animation: 'qt-tap .8s ease-out', ['--qt-tap' as string]: `${accent}88` } as React.CSSProperties

  return (
    <div className="min-h-[470px] bg-zinc-950 text-white">
      <div className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl text-base font-bold" style={{ background: `${accent}22`, color: accent }}>
            {plan.businessName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{plan.businessName}</p>
            {plan.tagline && <p className="text-xs text-zinc-500">{plan.tagline}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
        <div>
          <h3 className="text-lg font-semibold">Reservar turno</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Elige tu servicio, fecha y horario. Te contactaremos por WhatsApp para confirmar.</p>
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const n = i + 1
              return (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-500" style={{ background: step >= n ? accent : '#27272a', color: step >= n ? '#fff' : '#71717a' }}>
                      {step > n ? <Check size={12} /> : n}
                    </div>
                    <span className="hidden text-xs sm:block" style={{ color: step >= n ? '#fff' : '#71717a' }}>{s}</span>
                  </div>
                  {i < 2 && <div className="h-px flex-1 transition-colors duration-500" style={{ background: step > n ? accent : '#27272a' }} />}
                </div>
              )
            })}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2" key="s1" style={{ animation: 'qt-fade-up .4s ease-out both' }}>
            <p className="text-sm font-medium">Servicio</p>
            {plan.services.slice(0, 4).map((s, i) => {
              const selected = i === 0 && stage >= 1
              return (
                <div key={s.name} className="flex items-stretch overflow-hidden rounded-xl border transition-colors duration-300" style={{ borderColor: selected ? accent : '#27272a', background: selected ? `${accent}14` : 'transparent', ...(selected && stage === 1 ? tap : {}) }}>
                  <Photo photo={s.photo} accent={accent} className="w-20 shrink-0 sm:w-24">
                    {!s.photo && <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/90">{s.name.charAt(0)}</span>}
                  </Photo>
                  <div className="min-w-0 flex-1 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{s.name}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{s.durationMin > 0 ? `${s.durationMin} min · ` : ''}{money(s.price)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{s.description}</p>
                  </div>
                </div>
              )
            })}
            <div className="rounded-xl py-3 text-center text-sm font-semibold text-white transition-opacity" style={{ background: accent, opacity: stage >= 1 ? 1 : 0.4 }}>Continuar</div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4" key="s2" style={{ animation: 'qt-fade-up .4s ease-out both' }}>
            <div className="flex items-center gap-1 text-sm text-zinc-500"><ChevronLeft size={16} />{service.name}</div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Fecha</p>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const sel = i === 2 && stage >= 3
                  return (
                    <div key={i} className="flex flex-col items-center rounded-xl px-1 py-2.5 text-center transition-colors duration-300" style={{ background: sel ? accent : '#18181b', color: sel ? '#fff' : '#a1a1aa', ...(sel && stage === 3 ? tap : {}) }}>
                      <span className="text-[10px]">{DAYS[d.getDay()]}</span>
                      <span className="mt-0.5 text-sm font-semibold">{d.getDate()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {stage >= 3 && (
              <div className="space-y-2" style={{ animation: 'qt-fade-up .4s ease-out both' }}>
                <p className="text-sm font-medium">Horario disponible</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {SLOTS.map((s, i) => {
                    const sel = i === 1 && stage >= 4
                    return <div key={s} className="rounded-lg border py-2 text-center text-sm font-medium transition-colors duration-300" style={{ borderColor: sel ? accent : '#27272a', background: sel ? `${accent}22` : 'transparent', color: sel ? '#fff' : '#a1a1aa', ...(sel && stage === 4 ? tap : {}) }}>{s}</div>
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4" key="s3" style={{ animation: 'qt-fade-up .4s ease-out both' }}>
            <div className="space-y-1 rounded-xl border border-zinc-800 p-4 text-sm">
              <p className="font-medium">{service.name} · {money(service.price)}</p>
              <p className="text-zinc-500">{`${DAYS[pickedDay.getDay()]} ${pickedDay.getDate()} a las ${SLOTS[1]}`}{plan.staff[0] ? ` · ${plan.staffLabel} ${plan.staff[0]}` : ''}</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Tu nombre</p>
              <div className="min-h-[46px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">{stage >= 5 && <TypedText text="María López" speed={55} caret={stage === 5} />}</div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Tu WhatsApp</p>
              <div className="flex gap-2">
                <div className="w-[5.5rem] shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm">🇲🇽 +52</div>
                <div className="min-h-[46px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">{stage >= 6 && <TypedText text="624 123 4567" speed={55} caret={stage === 6} />}</div>
              </div>
            </div>
            <div className="rounded-xl py-3 text-center text-sm font-semibold text-white" style={{ background: accent, ...(stage === 7 ? tap : {}) }}>Confirmar reserva</div>
          </div>
        )}

        {step === 4 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center" key="s4" style={{ animation: 'qt-pop .4s ease-out both' }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${accent}22`, color: accent }}><Check size={28} /></div>
            <p className="text-lg font-semibold">¡Reserva confirmada!</p>
            <p className="max-w-xs text-sm text-zinc-400">{plan.businessName} te escribirá por WhatsApp para confirmar tu {service.name.toLowerCase()}.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function PublicLinkView({ plan, isDay }: { plan: DemoPlan; isDay: boolean }) {
  const [cycle, setCycle] = useState(0)
  return (
    <BrowserFrame url={`quickturno.app/book/${slugify(plan.businessName)}`} isDay={isDay}>
      <Flow key={cycle} plan={plan} onFinish={() => setCycle(c => c + 1)} />
    </BrowserFrame>
  )
}
