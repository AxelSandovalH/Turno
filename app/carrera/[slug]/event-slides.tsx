'use client'

import { useEffect, useRef, useState } from 'react'

interface Photo { src: string; alt?: string }
export interface PkgOption { name: string; price: number; label: string; includes?: string[] }

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const FIELD = 'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-yellow-300 focus:outline-none'
const digits = (v: string) => v.replace(/\D/g, '').length
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
.es-kb{animation:es-kb 9s ease-out both}
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
  // Paneles: portada, fotos, info, fotos y el registro dividido en pasos (cada uno con su foto)
  const steps = [...(p.packages.length > 1 ? ['paquete'] : []), 'datos', 'corredor', 'emergencia', 'pago']
  const panels = ['hero', ...(photoPanels[0] ? ['fotos0'] : []), 'info', ...(photoPanels[1] ? ['fotos1'] : []), ...steps]
  const last = panels.length - 1
  const firstStep = panels.indexOf(steps[0])

  const [idx, setIdx] = useState(p.cancelado ? firstStep : 0)
  const [bg, setBg] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const [form, setForm] = useState({ full_name: '', phone: '', email: '', birth_date: '', shirt_size: '', emergency_name: '', emergency_phone: '' })
  const [pkg, setPkg] = useState(p.packages[0]?.name ?? '')
  const [showErr, setShowErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payErr, setPayErr] = useState('')
  const chosen = p.packages.find(x => x.name === pkg) ?? p.packages[0]
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const errs = {
    full_name: form.full_name.trim().length < 3 ? 'Escribe tu nombre completo' : '',
    phone: digits(form.phone) < 10 ? 'Escribe un teléfono de 10 dígitos' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? 'Escribe un correo válido' : '',
  }
  const valid = (name: string) => name !== 'datos' || !(errs.full_name || errs.phone || errs.email)

  // Avanzar se bloquea en el primer paso incompleto
  const go = (n: number) => {
    const target = Math.min(Math.max(n, 0), last)
    for (let i = idx; i < target; i++) if (!valid(panels[i])) { setShowErr(true); setIdx(i); return }
    setIdx(target)
  }

  async function pay() {
    if (!valid('datos')) { setShowErr(true); setIdx(panels.indexOf('datos')); return }
    setBusy(true); setPayErr('')
    try {
      const res = await fetch('/api/events/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: p.slug, ...form, package: chosen?.name }) })
      const data = await res.json()
      if (!res.ok || !data.url) { setPayErr(data.error ?? 'No se pudo completar la inscripción'); setBusy(false); return }
      window.location.href = data.url
    } catch { setPayErr('Sin conexión, intenta de nuevo'); setBusy(false) }
  }

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
  })

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
                    {!p.closed && <button onClick={() => go(firstStep)} className="rounded-xl bg-yellow-400 px-7 py-3.5 text-base font-bold text-green-950 shadow-lg transition hover:bg-yellow-300">Inscribirme · desde {p.fromLabel}</button>}
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
              <div className="relative es-scroll flex h-full items-center overflow-y-auto px-5 pb-20 pt-14 md:px-10">
                {p.gallery[2] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.gallery[2].src} alt="" className="es-kb pointer-events-none fixed inset-0 -z-0 h-full w-full object-cover opacity-25" />
                )}
                <div className="relative mx-auto grid w-full max-w-5xl items-center gap-8 md:grid-cols-5">
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

            {steps.includes(name) && (() => {
              const k = steps.indexOf(name)
              const photo = p.gallery.length ? p.gallery[(k * 2 + 1) % p.gallery.length] : null
              const meta: Record<string, { title: string; sub: string }> = {
                paquete: { title: 'Elige tu paquete', sub: 'Todos incluyen tu lugar en la carrera.' },
                datos: { title: '¿Quién va a correr?', sub: 'Te mandaremos tu confirmación por correo y WhatsApp.' },
                corredor: { title: 'Casi listo', sub: 'Para preparar tu playera y tu número.' },
                emergencia: { title: 'Por tu seguridad', sub: 'Un contacto por si pasa algo el día del evento (opcional).' },
                pago: { title: 'Revisa y paga', sub: 'Pago seguro con tarjeta. Tu lugar se aparta al pagar.' },
              }
              const m = meta[name]
              const err = (k2: keyof typeof errs) => showErr && errs[k2] ? <p className="mt-1 text-xs text-red-300">{errs[k2]}</p> : null
              const next = <button type="button" onClick={() => go(idx + 1)} className="w-full rounded-xl bg-yellow-400 py-3.5 text-base font-bold text-green-950 transition hover:bg-yellow-300">Continuar</button>
              return (
                <div className="grid h-full grid-rows-[26dvh_1fr] md:grid-cols-2 md:grid-rows-1">
                  <div className="relative overflow-hidden">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.src} alt={photo.alt ?? ''} className="es-kb absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f2614] via-[#0f2614]/20 to-[#0f2614]/30 md:bg-gradient-to-r md:from-transparent md:via-[#0f2614]/10 md:to-[#0f2614]" />
                    <p className="absolute bottom-3 left-5 text-xs font-semibold uppercase tracking-[0.25em] text-yellow-300 md:bottom-8 md:left-8">Paso {k + 1} de {steps.length} · {p.title}</p>
                  </div>
                  <div className="es-scroll flex min-h-0 items-center overflow-y-auto px-5 pb-20 pt-4 md:px-10 md:pt-14">
                    <div className="mx-auto w-full max-w-md space-y-4">
                      <div data-a style={{ ['--i' as string]: 0 }}>
                        <h2 className="text-3xl font-black md:text-4xl">{m.title}</h2>
                        <p className="mt-1 text-sm text-green-50/70">{m.sub}</p>
                      </div>
                      {p.closed && <p className="rounded-xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p>}
                      {!p.closed && (
                        <div data-a style={{ ['--i' as string]: 1 }} className="space-y-3">
                          {name === 'paquete' && p.packages.map(o => (
                            <label key={o.name} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${pkg === o.name ? 'border-yellow-300 bg-yellow-300/10' : 'border-white/15 hover:border-white/40'}`}>
                              <input type="radio" name="pkg" checked={pkg === o.name} onChange={() => setPkg(o.name)} className="mt-1 accent-yellow-300" />
                              <span className="flex-1"><span className="flex items-baseline justify-between gap-2"><b>{o.name}</b><b className="text-yellow-300">{o.label}</b></span>
                                {!!o.includes?.length && <span className="mt-1 block text-xs text-white/60">{o.includes.join(' · ')}</span>}</span>
                            </label>
                          ))}
                          {name === 'datos' && (<>
                            {p.packages.length === 1 && chosen && <p className="rounded-xl bg-white/10 px-4 py-2.5 text-sm">🎟️ {chosen.name} · <b className="text-yellow-300">{chosen.label}</b></p>}
                            <div><input value={form.full_name} onChange={set('full_name')} placeholder="Nombre completo" autoComplete="name" className={FIELD} />{err('full_name')}</div>
                            <div><input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="Teléfono (WhatsApp)" autoComplete="tel" className={FIELD} />{err('phone')}</div>
                            <div><input value={form.email} onChange={set('email')} type="email" placeholder="Correo" autoComplete="email" className={FIELD} />{err('email')}</div>
                          </>)}
                          {name === 'corredor' && (<>
                            <label className="block text-xs text-white/60">Fecha de nacimiento<input value={form.birth_date} onChange={set('birth_date')} type="date" className={`${FIELD} mt-1`} /></label>
                            <label className="block text-xs text-white/60">Talla de playera
                              <select value={form.shirt_size} onChange={set('shirt_size')} className={`${FIELD} mt-1`}><option value="" className="text-black">Elegir talla</option>{SIZES.map(z => <option key={z} value={z} className="text-black">{z}</option>)}</select>
                            </label>
                          </>)}
                          {name === 'emergencia' && (<>
                            <input value={form.emergency_name} onChange={set('emergency_name')} placeholder="Nombre del contacto" className={FIELD} />
                            <input value={form.emergency_phone} onChange={set('emergency_phone')} type="tel" placeholder="Teléfono del contacto" className={FIELD} />
                          </>)}
                          {name === 'pago' && (
                            <div className="space-y-2 rounded-2xl bg-black/25 p-4 text-sm">
                              <div className="flex justify-between"><span className="text-white/60">Corredor</span><b>{form.full_name || '—'}</b></div>
                              <div className="flex justify-between"><span className="text-white/60">Correo</span><span>{form.email || '—'}</span></div>
                              {form.shirt_size && <div className="flex justify-between"><span className="text-white/60">Playera</span><span>{form.shirt_size}</span></div>}
                              <div className="flex justify-between"><span className="text-white/60">Paquete</span><span>{chosen?.name}</span></div>
                              <div className="flex justify-between border-t border-white/15 pt-2 text-lg"><span>Total</span><b className="text-yellow-300">{chosen?.label}</b></div>
                            </div>
                          )}
                          {name === 'pago'
                            ? <>{payErr && <p className="text-sm text-red-300">{payErr}</p>}
                                <button type="button" disabled={busy} onClick={pay} className="w-full rounded-xl bg-yellow-400 py-3.5 text-base font-bold text-green-950 transition hover:bg-yellow-300 disabled:opacity-60">{busy ? 'Abriendo pago…' : `Pagar ${chosen?.label}`}</button>
                                {p.cancelado && <p className="rounded-lg bg-yellow-400/15 px-3 py-2 text-xs text-yellow-200">El pago anterior no se completó. Puedes intentarlo de nuevo.</p>}</>
                            : next}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </section>
        )
      })}

      {/* Marca arriba, navegación abajo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">{p.title}</span>
        {idx > 0 && !p.closed && idx < firstStep && <button onClick={() => go(firstStep)} className="pointer-events-auto rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-green-950">Inscribirme</button>}
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
