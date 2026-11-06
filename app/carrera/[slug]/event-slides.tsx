'use client'

import { useEffect, useRef, useState } from 'react'

interface Photo { src: string; alt?: string }
export interface PkgOption { name: string; price: number; label: string; includes?: string[] }

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const FIELD = 'h-14 w-full rounded-2xl bg-white/[0.07] px-4 text-[17px] text-white outline-none ring-1 ring-inset ring-white/10 transition placeholder:text-white/35 focus:bg-white/[0.1] focus:ring-2 focus:ring-[#ffd60a]'
const digits = (v: string) => v.replace(/\D/g, '').length
export interface SlidesProps {
  slug: string; title: string; subtitle: string | null; organizer: string | null; description: string | null
  when: string; time: string; location: string | null; fromLabel: string
  flyer: string | null; gallery: Photo[]; packages: PkgOption[]
  closed: boolean; spotsLeft: number | null; cancelado: boolean
}

const CSS = `
.es-root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.es-root h1,.es-root h2{text-wrap:balance}
.es-panel{transition:transform .9s cubic-bezier(.76,0,.2,1),opacity .6s ease}
.es-panel:not(.on) [data-a]{opacity:0}
.es-panel.on [data-a]{animation:es-rise .9s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*110ms + 300ms)}
.es-panel.on .es-tile{animation:es-pop 1s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*180ms + 400ms)}
.es-panel:not(.on) .es-tile{opacity:0}
.es-panel.on .es-tile img{animation:es-kb 10s cubic-bezier(.2,.6,.2,1) both;animation-delay:calc(var(--i,0)*180ms + 400ms)}
.es-kb{animation:es-kb 10s cubic-bezier(.2,.6,.2,1) both}
.es-bg{transition:opacity 1.8s ease}
.es-bg.show img{animation:es-kb 9s cubic-bezier(.2,.6,.2,1) both}
.es-scroll{scrollbar-width:none}.es-scroll::-webkit-scrollbar{display:none}
@keyframes es-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes es-pop{from{opacity:0;transform:scale(.94) translateY(24px)}to{opacity:1;transform:none}}
@keyframes es-kb{from{transform:scale(1.1)}to{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.es-panel,.es-panel [data-a],.es-tile,.es-tile img,.es-bg img,.es-kb{animation:none!important;transition:none!important}.es-panel:not(.on) [data-a],.es-panel:not(.on) .es-tile{opacity:1}}
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

  // Desde la portada: si los datos de contacto están bien, el registro sigue en el siguiente paso pendiente
  function startFromHero() {
    if (!valid('datos')) { setShowErr(true); return }
    setShowErr(false)
    setIdx(panels.indexOf('corredor'))
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

  const ACCENT = 'bg-[#ffd60a] text-black'
  const primary = `h-14 w-full rounded-full ${ACCENT} text-[17px] font-semibold transition hover:brightness-105 active:scale-[.985] disabled:opacity-60`
  const eyebrow = 'text-[12px] font-semibold uppercase tracking-[0.18em] text-white/55'
  const h2 = 'text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.035em] md:text-[3.4rem]'
  const dateLine = `${p.when.replace(/^\w+,\s*/, '')}${p.time ? ' · ' + p.time : ''}`
  const card = 'overflow-hidden rounded-[26px] es-tile bg-white/5'

  return (
    <div ref={root} className="es-root relative h-dvh w-full overflow-hidden bg-[#070907] text-white" onWheel={onWheel}
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
              <div className="grid h-full grid-rows-[34dvh_1fr] md:grid-cols-[1.15fr_minmax(0,540px)] md:grid-rows-1 lg:grid-cols-[1.3fr_minmax(0,580px)]">
                <div className="relative overflow-hidden">
                  {p.gallery.map((g, k) => (
                    <div key={g.src} className={`es-bg absolute inset-0 overflow-hidden ${k === bg ? 'show opacity-100' : 'opacity-0'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#070907]/90 via-[#070907]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-6 pb-5 md:px-12 md:pb-20">
                    {p.organizer && <p data-a style={{ ['--i' as string]: 0 }} className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#ffd60a] md:text-[13px]">{p.organizer}</p>}
                    <h1 data-a style={{ ['--i' as string]: 1 }} className="mt-1 text-[clamp(2.8rem,8.5vw,7.5rem)] font-semibold leading-[.92] tracking-[-0.05em]">{p.title}</h1>
                    <p data-a style={{ ['--i' as string]: 2 }} className="mt-2 text-[15px] text-white/80 md:mt-3 md:text-xl">{dateLine}{p.location ? ` · ${p.location}` : ''}</p>
                  </div>
                </div>

                <div className="es-scroll flex min-h-0 items-center overflow-y-auto px-6 pb-24 pt-6 md:px-14 md:pt-8">
                  <div data-a style={{ ['--i' as string]: 2 }} className="mx-auto w-full max-w-[420px]">
                    {p.closed ? (
                      <p className="py-6 text-center text-[17px] font-medium">Las inscripciones están cerradas.</p>
                    ) : (
                      <form onSubmit={e => { e.preventDefault(); startFromHero() }} className="space-y-3">
                        <div>
                          <p className={eyebrow}>Inscripción · {p.packages.length > 1 ? `desde ${p.fromLabel}` : p.fromLabel}</p>
                          <h2 className="mt-1 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[2.8rem]">Reserva tu lugar.</h2>
                          <p className="mb-3 mt-2 text-[17px] leading-snug text-white/60">Empieza con tus datos. Tu lugar se aparta al pagar.</p>
                        </div>
                        {p.packages.length > 1 && (
                          <div className="flex flex-wrap gap-2 pb-1">
                            {p.packages.map(o => (
                              <button type="button" key={o.name} onClick={() => setPkg(o.name)} className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium ring-1 ring-inset transition ${pkg === o.name ? 'bg-[#ffd60a] text-black ring-[#ffd60a]' : 'text-white/80 ring-white/25 hover:ring-white/50'}`}>{o.name} · {o.label}</button>
                            ))}
                          </div>
                        )}
                        <div><input value={form.full_name} onChange={set('full_name')} placeholder="Nombre completo" autoComplete="name" className={FIELD} />{showErr && errs.full_name && <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs.full_name}</p>}</div>
                        <div><input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="Teléfono (WhatsApp)" autoComplete="tel" className={FIELD} />{showErr && errs.phone && <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs.phone}</p>}</div>
                        <div><input value={form.email} onChange={set('email')} type="email" placeholder="Correo electrónico" autoComplete="email" className={FIELD} />{showErr && errs.email && <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs.email}</p>}</div>
                        <button type="submit" className={primary}>Continuar</button>
                        <div className="flex items-center justify-between px-1 pt-1 text-[15px]">
                          <button type="button" onClick={() => go(1)} className="text-white/60 transition hover:text-white">Conocer más <span aria-hidden>›</span></button>
                          {p.spotsLeft !== null && p.spotsLeft > 0 && p.spotsLeft <= 50 && <span className="text-[13px] text-[#ffd60a]">Quedan {p.spotsLeft} lugares</span>}
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(name === 'fotos0' || name === 'fotos1') && (() => {
              const k = name === 'fotos0' ? 0 : 1
              return (
                <div className="flex h-full flex-col px-4 pb-24 pt-16 md:px-12 md:pt-20">
                  <div data-a style={{ ['--i' as string]: 0 }} className="mx-auto mb-5 w-full max-w-6xl">
                    <p className={eyebrow}>{p.title}</p>
                    <h2 className={`${h2} mt-1.5`}>{captions[k]}</h2>
                  </div>
                  <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-2 grid-rows-3 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
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
              <div className="relative h-full">
                {p.gallery[2] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.gallery[2].src} alt="" className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-[.22] blur-2xl" />
                )}
                <div className="es-scroll relative flex h-full items-center overflow-y-auto px-6 pb-24 pt-16 md:px-12">
                  <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,380px)_1fr] md:gap-16">
                    {p.flyer && (
                      <div data-a style={{ ['--i' as string]: 0 }} className="mx-auto w-full max-w-[250px] md:max-w-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.flyer} alt={`Cartel de ${p.title}`} className="max-h-[56dvh] w-full rounded-[26px] object-contain shadow-2xl shadow-black/60 md:max-h-[74dvh]" />
                      </div>
                    )}
                    <div className="space-y-7">
                      <div data-a style={{ ['--i' as string]: 1 }}>
                        <p className={eyebrow}>La carrera</p>
                        <h2 className={`${h2} mt-1.5`}>Qué te espera.</h2>
                      </div>
                      {p.description && <p data-a style={{ ['--i' as string]: 2 }} className="max-w-xl whitespace-pre-line text-[17px] leading-relaxed text-white/70 md:text-xl">{p.description}</p>}
                      <dl data-a style={{ ['--i' as string]: 3 }} className="max-w-xl divide-y divide-white/10 border-y border-white/10 text-[17px]">
                        <div className="flex justify-between gap-6 py-3"><dt className="text-white/50">Fecha</dt><dd className="text-right">{p.when.charAt(0).toUpperCase() + p.when.slice(1)}</dd></div>
                        <div className="flex justify-between gap-6 py-3"><dt className="text-white/50">Salida</dt><dd className="text-right">{p.time}</dd></div>
                        {p.location && <div className="flex justify-between gap-6 py-3"><dt className="text-white/50">Lugar</dt><dd className="text-right">{p.location}</dd></div>}
                        {p.packages.map(pk => <div key={pk.name} className="flex justify-between gap-6 py-3"><dt className="text-white/50">{pk.name}</dt><dd className="text-right font-semibold text-[#ffd60a]">{pk.label}</dd></div>)}
                      </dl>
                      {!!p.packages[0]?.includes?.length && (
                        <ul data-a style={{ ['--i' as string]: 4 }} className="grid max-w-xl gap-x-6 gap-y-2 text-[15px] text-white/75 sm:grid-cols-2">
                          {p.packages[0].includes.map(it => <li key={it} className="flex gap-2"><span className="text-[#ffd60a]">✓</span>{it}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {steps.includes(name) && (() => {
              const k = steps.indexOf(name)
              const photo = p.gallery.length ? p.gallery[(k * 2 + 1) % p.gallery.length] : null
              const meta: Record<string, { title: string; sub: string }> = {
                paquete: { title: 'Elige tu paquete.', sub: 'Todos incluyen tu lugar en la carrera.' },
                datos: { title: '¿Quién va a correr?', sub: 'Te enviaremos la confirmación por correo y WhatsApp.' },
                corredor: { title: 'Casi listo.', sub: 'Para preparar tu playera y tu número.' },
                emergencia: { title: 'Por tu seguridad.', sub: 'Un contacto por si pasa algo el día del evento. Es opcional.' },
                pago: { title: 'Revisa y paga.', sub: 'Pago seguro con tarjeta. Tu lugar se aparta al pagar.' },
              }
              const m = meta[name]
              const err = (k2: keyof typeof errs) => showErr && errs[k2] ? <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs[k2]}</p> : null
              const next = <button type="button" onClick={() => go(idx + 1)} className={primary}>Continuar</button>
              return (
                <div className="grid h-full grid-rows-[24dvh_1fr] md:grid-cols-[1fr_minmax(0,560px)] md:grid-rows-1 lg:grid-cols-[1.15fr_minmax(0,620px)]">
                  <div className="relative overflow-hidden">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.src} alt={photo.alt ?? ''} className="es-kb absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070907] via-transparent to-transparent md:bg-gradient-to-l md:from-[#070907] md:via-transparent md:to-transparent md:[mask-image:none]" />
                  </div>
                  <div className="es-scroll flex min-h-0 items-center overflow-y-auto px-6 pb-24 pt-2 md:px-14 md:pt-8">
                    <div className="mx-auto w-full max-w-[420px] space-y-6">
                      <div data-a style={{ ['--i' as string]: 0 }} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-1 gap-1.5">{steps.map((_, n) => <span key={n} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${n <= k ? 'bg-[#ffd60a]' : 'bg-white/15'}`} />)}</div>
                          <span className="text-[12px] font-medium tabular-nums text-white/50">{k + 1}/{steps.length}</span>
                        </div>
                        <div>
                          <h2 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[2.8rem]">{m.title}</h2>
                          <p className="mt-2 text-[17px] leading-snug text-white/60">{m.sub}</p>
                        </div>
                      </div>
                      {p.closed && <p className="rounded-2xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p>}
                      {!p.closed && (
                        <div data-a style={{ ['--i' as string]: 1 }} className="space-y-3">
                          {name === 'paquete' && p.packages.map(o => (
                            <label key={o.name} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-inset transition ${pkg === o.name ? 'bg-[#ffd60a]/10 ring-2 ring-[#ffd60a]' : 'bg-white/[0.05] ring-white/10 hover:bg-white/[0.08]'}`}>
                              <input type="radio" name="pkg" checked={pkg === o.name} onChange={() => setPkg(o.name)} className="mt-1 accent-[#ffd60a]" />
                              <span className="flex-1"><span className="flex items-baseline justify-between gap-2 text-[17px]"><b className="font-semibold">{o.name}</b><b className="font-semibold text-[#ffd60a]">{o.label}</b></span>
                                {!!o.includes?.length && <span className="mt-1 block text-[13px] text-white/55">{o.includes.join(' · ')}</span>}</span>
                            </label>
                          ))}
                          {name === 'datos' && (<>
                            {p.packages.length === 1 && chosen && <p className="flex justify-between rounded-2xl bg-white/[0.05] px-4 py-3 text-[15px] ring-1 ring-inset ring-white/10"><span className="text-white/60">{chosen.name}</span><b className="font-semibold text-[#ffd60a]">{chosen.label}</b></p>}
                            <div><input value={form.full_name} onChange={set('full_name')} placeholder="Nombre completo" autoComplete="name" className={FIELD} />{err('full_name')}</div>
                            <div><input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="Teléfono (WhatsApp)" autoComplete="tel" className={FIELD} />{err('phone')}</div>
                            <div><input value={form.email} onChange={set('email')} type="email" placeholder="Correo electrónico" autoComplete="email" className={FIELD} />{err('email')}</div>
                          </>)}
                          {name === 'corredor' && (<>
                            <label className="block"><span className="mb-1.5 block px-1 text-[13px] text-white/50">Fecha de nacimiento</span><input value={form.birth_date} onChange={set('birth_date')} type="date" className={`${FIELD} [color-scheme:dark]`} /></label>
                            <label className="block"><span className="mb-1.5 block px-1 text-[13px] text-white/50">Talla de playera</span>
                              <select value={form.shirt_size} onChange={set('shirt_size')} className={`${FIELD} [color-scheme:dark]`}><option value="">Elegir talla</option>{SIZES.map(z => <option key={z} value={z}>{z}</option>)}</select>
                            </label>
                          </>)}
                          {name === 'emergencia' && (<>
                            <input value={form.emergency_name} onChange={set('emergency_name')} placeholder="Nombre del contacto" className={FIELD} />
                            <input value={form.emergency_phone} onChange={set('emergency_phone')} type="tel" placeholder="Teléfono del contacto" className={FIELD} />
                          </>)}
                          {name === 'pago' && (
                            <div className="divide-y divide-white/10 rounded-2xl bg-white/[0.05] px-4 text-[15px] ring-1 ring-inset ring-white/10">
                              <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Corredor</span><b className="font-medium">{form.full_name || '—'}</b></div>
                              <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Correo</span><span className="truncate">{form.email || '—'}</span></div>
                              {form.shirt_size && <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Playera</span><span>{form.shirt_size}</span></div>}
                              <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Paquete</span><span>{chosen?.name}</span></div>
                              <div className="flex items-baseline justify-between gap-4 py-4 text-xl"><span className="font-semibold">Total</span><b className="font-semibold text-[#ffd60a]">{chosen?.label}</b></div>
                            </div>
                          )}
                          {name === 'pago'
                            ? <>{payErr && <p className="px-1 text-[13px] text-[#ff9f0a]">{payErr}</p>}
                                <button type="button" disabled={busy} onClick={pay} className={primary}>{busy ? 'Abriendo pago…' : `Pagar ${chosen?.label}`}</button>
                                {p.cancelado && <p className="px-1 text-[13px] text-white/50">El pago anterior no se completó. Puedes intentarlo de nuevo.</p>}</>
                            : next}
                          {idx > firstStep && <button type="button" onClick={() => go(idx - 1)} className="mx-auto block pt-1 text-[15px] text-white/55 transition hover:text-white">‹ Atrás</button>}
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

      {/* Marca arriba; navegación flotante abajo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-semibold tracking-tight text-white/90 ring-1 ring-white/10 backdrop-blur-xl">{p.title}</span>
        {idx > 0 && !p.closed && idx < firstStep && <button onClick={() => go(firstStep)} className={`pointer-events-auto rounded-full px-4 py-1.5 text-[13px] font-semibold ${ACCENT}`}>Inscribirme</button>}
      </div>
      <nav aria-label="Paneles" className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/35 p-1.5 ring-1 ring-white/15 backdrop-blur-xl">
        <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Anterior" className="grid h-9 w-9 place-items-center rounded-full text-lg text-white/80 transition hover:bg-white/15 disabled:opacity-25">‹</button>
        <div className="flex items-center gap-1.5 px-1">
          {panels.map((n, i) => <button key={n} onClick={() => go(i)} aria-label={`Panel ${i + 1}`} className={`h-[7px] rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-white' : 'w-[7px] bg-white/35 hover:bg-white/55'}`} />)}
        </div>
        <button onClick={() => go(idx + 1)} disabled={idx === last} aria-label="Siguiente" className="grid h-9 w-9 place-items-center rounded-full text-lg text-white/80 transition hover:bg-white/15 disabled:opacity-25">›</button>
      </nav>
    </div>
  )
}
