'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { SEGMENTS } from './segments-data'
import type { Tokens } from './feature-visuals'

interface Props {
  t: Tokens
  isDay: boolean
}

/** Mini agenda del giro mostrado. Hace tangible el "hecho para tu giro":
 *  los servicios, los horarios y hasta cómo se le llama al staff cambian.
 *  Los puntos de la agenda usan el acento del giro con 2 variaciones de
 *  opacidad en vez de 3 colores fijos — se siente "de la familia" del giro
 *  sin perder la jerarquía entre filas. */
function AgendaPreview({ t, isDay, index }: { t: Tokens; isDay: boolean; index: number }) {
  const seg = SEGMENTS[index]

  return (
    <div
      aria-hidden="true"
      className="rounded-2xl overflow-hidden w-full transition-colors duration-300"
      style={{
        background: t.card,
        border: `1px solid ${seg.accent}2a`,
        boxShadow: `0 24px 60px -24px rgba(0,0,0,0.45), 0 0 0 1px ${seg.accent}08`,
      }}
    >
      {/* Barra de ventana */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: `1px solid ${t.border}`, background: isDay ? '#faf9f6' : '#0c0c0c' }}
      >
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-2 h-2 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <span className="text-[10.5px] truncate" style={{ color: t.muted }}>
          app.quickturno.app/{seg.window?.path ?? 'appointments'}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <p className="text-[12.5px] font-semibold" style={{ color: t.text }}>{seg.window?.title ?? 'Hoy · Agenda'}</p>
          <p className="text-[10.5px] uppercase tracking-wider shrink-0" style={{ color: seg.accent }}>
            {seg.staffLabel}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {seg.preview.map((row, i) => (
            <div
              key={`${index}-${i}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: `${seg.accent}${i === 0 ? '1c' : '0e'}`,
                borderLeft: `3px solid ${seg.accent}${i === 0 ? 'ff' : '99'}`,
              }}
            >
              <span className="text-[11.5px] font-semibold tabular-nums shrink-0" style={{ color: t.text }}>
                {row.time}
              </span>
              <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: t.text }}>
                {row.title}
              </span>
              <span className="text-[11px] truncate shrink-0 max-w-[38%]" style={{ color: t.muted }}>
                {row.who}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Burbuja flotante de un giro. Flota en reposo (CSS puro, sin JS por frame);
 *  en hover de mouse adelanta el preview sin confirmar selección; el click
 *  (o tap, que en touch nunca disparó el hover) sí la fija. */
function SegmentChip({ seg, isShown, isActive, index, onPreview, onSelect }: {
  seg: typeof SEGMENTS[number]
  isShown: boolean
  isActive: boolean
  index: number
  onPreview: (i: number | null) => void
  onSelect: (i: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      onPointerEnter={e => { if (e.pointerType === 'mouse') onPreview(index) }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') onPreview(null) }}
      onFocus={() => onPreview(index)}
      onBlur={() => onPreview(null)}
      aria-pressed={isActive}
      aria-label={seg.name}
      className="flex flex-col items-center gap-2 shrink-0 group"
    >
      <span
        className="animate-float-chip flex items-center justify-center rounded-full text-[26px] sm:text-[30px] transition-all duration-300"
        style={{
          width: 64,
          height: 64,
          background: '#ffffff',
          border: `1.5px solid ${isShown ? seg.accent : 'transparent'}`,
          boxShadow: isShown
            ? `0 10px 28px -8px ${seg.accent}88, 0 2px 8px -2px rgba(0,0,0,0.12)`
            : '0 6px 16px -6px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08)',
          transform: isShown ? 'scale(1.08)' : 'scale(1)',
          animationPlayState: isShown ? 'paused' : 'running',
          animationDelay: `${index * 0.35}s`,
        }}
      >
        {seg.emoji}
      </span>
      <span
        className="text-[11px] font-medium text-center leading-tight whitespace-nowrap transition-colors duration-300"
        style={{ color: isShown ? seg.accent : undefined }}
      >
        {seg.short}
      </span>
    </button>
  )
}

export function SegmentShowcase({ t, isDay }: Props) {
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? active
  const seg = SEGMENTS[shown]

  return (
    <section id="segments" style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
        <div data-section-head className="mb-12 sm:mb-14" style={{ opacity: 0 }}>
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Giros</p>
          <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>¿Manejas citas o pedidos? Turno es para ti.</h2>
          <p className="text-[16px] max-w-lg" style={{ color: t.muted }}>Pasa el cursor por tu giro — o tócalo si estás en el teléfono.</p>
        </div>

        {/* Cluster de íconos flotantes — wrap en todos los tamaños para que
            las 7 burbujas se vean sin necesitar scroll lateral en móvil */}
        <div
          className="flex flex-wrap justify-center gap-x-4 gap-y-6 mb-12 sm:mb-16 px-2 sm:px-4 py-2"
          onMouseLeave={() => setHovered(null)}
        >
          {SEGMENTS.map((s, i) => (
            <SegmentChip
              key={s.name}
              seg={s}
              index={i}
              isShown={shown === i}
              isActive={active === i}
              onPreview={setHovered}
              onSelect={setActive}
            />
          ))}
        </div>

        {/* Panel del giro mostrado */}
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div key={shown} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p
              className="font-serif text-[19px] sm:text-[22px] leading-[1.45] mb-7 pl-5"
              style={{ color: t.text, borderLeft: `2.5px solid ${seg.accent}`, transition: 'border-color .3s' }}
            >
              {seg.pain}
            </p>
            <ul className="space-y-3.5">
              {seg.bullets.map(b => (
                <li key={b} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300"
                    style={{ background: `${seg.accent}1a` }}
                  >
                    <Check className="h-3 w-3" style={{ color: seg.accent }} strokeWidth={2.5} />
                  </span>
                  <span className="text-[14.5px] leading-relaxed" style={{ color: t.muted }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div key={`preview-${shown}`} className="animate-in fade-in duration-500">
            <AgendaPreview t={t} isDay={isDay} index={shown} />
          </div>
        </div>
      </div>
    </section>
  )
}
