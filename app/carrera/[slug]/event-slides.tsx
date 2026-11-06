'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RegisterForm, type PkgOption } from './register-form'

interface Photo { src: string; alt?: string }
export interface SlidesProps {
  slug: string; title: string; subtitle: string | null; organizer: string | null; description: string | null
  when: string; time: string; location: string | null; fromLabel: string
  flyer: string | null; gallery: Photo[]; packages: PkgOption[]
  closed: boolean; spotsLeft: number | null; cancelado: boolean
}

const CSS = `
.es-panel{transition:transform .8s cubic-bezier(.77,0,.18,1),opacity .6s}
.es-panel:not(.on) [data-a]{opacity:0}
.es-panel.on [data-a]{animation:es-rise .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0)*140ms + 350ms)}
.es-panel.on .es-tile{animation:es-pop .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0)*220ms + 450ms)}
.es-panel:not(.on) .es-tile{opacity:0}
.es-panel.on .es-tile img{animation:es-kb 9s ease-out both;animation-delay:calc(var(--i,0)*220ms + 450ms)}
.es-bg{transition:opacity 1.6s ease}
.es-bg.show img{animation:es-kb 8s ease-out both}
@keyframes es-rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes es-pop{from{opacity:0;transform:scale(.86) rotate(-2.5deg) translateY(30px)}to{opacity:1;transform:none}}
@keyframes es-kb{from{transform:scale(1.12)}to{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.es-panel,.es-panel [data-a],.es-tile,.es-tile img,.es-bg img{animation:none!important;transition:none!important}.es-panel:not(.on) [data-a],.es-panel:not(.on) .es-tile{opacity:1}}
`

export function EventSlides(p: SlidesProps) {
  const photoPanels = p.gallery.length >= 5 ? [p.gallery.slice(0, 5), p.gallery.slice(5, 10)].filter(g => g.length >= 3) : []
  const captions = ['Una mañana llena de energía', 'Corre, disfruta y haz que cada paso cuente']
  // Paneles: portada, fotos A, info, fotos B (si hay), inscripción
  const panels = ['hero', ...(photoPanels[0] ? ['fotos0'] : []), 'info', ...(photoPanels[1] ? ['fotos1'] : []), 'inscripcion']
  const last = panels.length - 1

  const [idx, setIdx] = useState(0)
  const [bg, setBg] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback((n: number) => setIdx(Math.min(Math.max(n, 0), last)), [last])

  // Portada: el fondo rota entre las fotos
  useEffect(() => {
    if (p.gallery.length < 2) return
    const t = setInterval(() => setBg(b => (b + 1) % p.gallery.length), 4500)
    return () => clearInterval(t)
  }, [p.gallery.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') go(idx + 1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx])

  function onWheel(e: React.WheelEvent) {
    if (lock.current || Math.abs(e.deltaY) < 30) return
    // Si el panel tiene scroll interno (formulario en pantallas chicas), solo cambia de panel al llegar al borde
    const el = root.current?.querySelector<HTMLElement>('.es-panel.on .es-scroll')
    if (el && el.scrollHeight > el.clientHeight + 2) {
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      const atStart = el.scrollTop <= 0
      if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atStart)) return
    }
    lock.current = true
    go(idx + (e.deltaY > 0 ? 1 : -1))
    setTimeout(() => { lock.current = false }, 900)
  }

  const tileCls = ['col-span-2 md:row-span-2', '', '', '', '']
  const card = 'overflow-hidden rounded-2xl shadow-xl shadow-black/40 es-tile'

  return (
    <div ref={root} className="relative h-dvh w-full overflow-hidden bg-[#0f2614] text-white" onWheel={onWheel}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => {
        const t = touch.current; if (!t) return
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) go(idx + (dx < 0 ? 1 : -1))
        touch.current = null
      }}>
      <style>{CSS}</style>

      {panels.map((name, i) => {
        const on = i === idx
        return (
          <section key={name} aria-hidden={!on} {...(!on ? { inert: true } : {})} className={`es-panel absolute inset-0 ${on ? 'on' : ''}`}
            style={{ transform: `translateX(${(i - idx) * 100}%)`, opacity: Math.abs(i - idx) > 1 ? 0 : 1 }}>
            {name === 'hero' && (
              <div className="relative flex h-full items-center justify-center px-5 text-center">
                {p.gallery.map((g, k) => (
                  <div key={g.src} className={`es-bg absolute inset-0 overflow-hidden ${k === bg ? 'show opacity-100' : 'opacity-0'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f2614]/60 via-[#0f2614]/55 to-[#0f2614]/90" />
                <div className="relative max-w-3xl">
                  {p.organizer && <p data-a style={{ ['--i' as string]: 0 }} className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-300">{p.organizer}</p>}
                  <h1 data-a style={{ ['--i' as string]: 1 }} className="mt-3 text-6xl font-black leading-none md:text-8xl">{p.title}</h1>
                  {p.subtitle && <p data-a style={{ ['--i' as string]: 2 }} className="mt-4 text-lg text-green-50/90 md:text-xl">{p.subtitle}</p>}
                  <div data-a style={{ ['--i' as string]: 3 }} className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm">
                    <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📅 <span className="capitalize">{p.when}</span></span>
                    <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">⏰ {p.time}</span>
                    {p.location && <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📍 {p.location}</span>}
                  </div>
                  <div data-a style={{ ['--i' as string]: 4 }} className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {!p.closed && <button onClick={() => go(last)} className="rounded-xl bg-yellow-400 px-7 py-3.5 text-base font-bold text-green-950 shadow-lg transition hover:bg-yellow-300">Inscribirme · desde {p.fromLabel}</button>}
                    <button onClick={() => go(1)} className="rounded-xl border border-white/40 px-6 py-3.5 text-base font-medium backdrop-blur transition hover:bg-white/10">Conocer más</button>
                  </div>
                  {p.spotsLeft !== null && p.spotsLeft > 0 && p.spotsLeft <= 50 && <p data-a style={{ ['--i' as string]: 5 }} className="mt-4 text-sm text-yellow-200">⚡ Quedan {p.spotsLeft} lugares</p>}
                </div>
              </div>
            )}

            {(name === 'fotos0' || name === 'fotos1') && (() => {
              const k = name === 'fotos0' ? 0 : 1
              return (
                <div className="flex h-full flex-col px-4 pb-20 pt-14 md:px-10 md:pt-16">
                  <h2 data-a style={{ ['--i' as string]: 0 }} className="mb-3 text-center text-2xl font-extrabold md:text-4xl">{captions[k]}</h2>
                  <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-2 grid-rows-3 gap-3 md:grid-cols-4 md:grid-rows-2">
                    {photoPanels[k].map((g, j) => (
                      <div key={g.src} style={{ ['--i' as string]: j }} className={`${card} ${tileCls[j] ?? ''}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.src} alt={g.alt ?? ''} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {name === 'info' && (
              <div className="es-scroll flex h-full items-center overflow-y-auto px-5 pb-20 pt-14 md:px-10">
                <div className="mx-auto grid w-full max-w-5xl items-center gap-8 md:grid-cols-5">
                  {p.flyer && (
                    <div data-a style={{ ['--i' as string]: 0 }} className="mx-auto w-full max-w-[260px] md:col-span-2 md:max-w-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.flyer} alt={`Cartel de ${p.title}`} className="max-h-[60dvh] w-full rounded-2xl object-contain shadow-2xl md:max-h-[72dvh]" />
                    </div>
                  )}
                  <div className="space-y-4 md:col-span-3">
                    <h2 data-a style={{ ['--i' as string]: 1 }} className="text-3xl font-black md:text-5xl">¿Qué te espera?</h2>
                    {p.description && <p data-a style={{ ['--i' as string]: 2 }} className="whitespace-pre-line text-[15px] leading-relaxed text-green-50/85 md:text-lg">{p.description}</p>}
                    <ul data-a style={{ ['--i' as string]: 3 }} className="space-y-1.5 text-[15px] text-green-50/90">
                      <li>📅 <span className="capitalize">{p.when}</span>, {p.time}</li>
                      {p.location && <li>📍 {p.location}</li>}
                    </ul>
                    <div data-a style={{ ['--i' as string]: 4 }} className="flex flex-wrap gap-2">
                      {p.packages.map(pk => (
                        <div key={pk.name} className="rounded-xl bg-white/10 px-4 py-3">
                          <p className="font-bold">{pk.name} · <span className="text-yellow-300">{pk.label}</span></p>
                          {!!pk.includes?.length && <p className="mt-0.5 text-xs text-white/65">{pk.includes.join(' · ')}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {name === 'inscripcion' && (
              <div className="es-scroll flex h-full items-center overflow-y-auto px-4 pb-20 pt-14 md:px-10">
                <div className="mx-auto w-full max-w-xl space-y-4">
                  <h2 data-a style={{ ['--i' as string]: 0 }} className="text-center text-3xl font-black md:text-4xl">Inscripción</h2>
                  {p.cancelado && <p className="rounded-lg bg-yellow-400/15 px-3 py-2 text-sm text-yellow-200">El pago no se completó. Puedes intentarlo de nuevo cuando quieras.</p>}
                  <div data-a style={{ ['--i' as string]: 1 }}>
                    {p.closed
                      ? <p className="rounded-xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p>
                      : <RegisterForm slug={p.slug} packages={p.packages} />}
                  </div>
                  <p data-a style={{ ['--i' as string]: 2 }} className="text-center text-xs text-green-50/50">Pago seguro con Stripe. Recibirás tu confirmación por correo.</p>
                </div>
              </div>
            )}
          </section>
        )
      })}

      {/* Marca arriba, navegación abajo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">{p.title}</span>
        {idx > 0 && !p.closed && idx < last && <button onClick={() => go(last)} className="pointer-events-auto rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-green-950">Inscribirme</button>}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-4 py-4 md:px-8">
        <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Anterior" className="h-11 w-11 rounded-full bg-white/15 text-xl backdrop-blur transition hover:bg-white/25 disabled:opacity-0">‹</button>
        <div className="flex gap-2">
          {panels.map((n, i) => <button key={n} onClick={() => go(i)} aria-label={`Panel ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? 'w-7 bg-yellow-300' : 'w-2 bg-white/40'}`} />)}
        </div>
        <button onClick={() => go(idx + 1)} disabled={idx === last} aria-label="Siguiente" className="h-11 w-11 rounded-full bg-white/15 text-xl backdrop-blur transition hover:bg-white/25 disabled:opacity-0">›</button>
      </div>
    </div>
  )
}
