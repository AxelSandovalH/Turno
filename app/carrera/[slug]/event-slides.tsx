'use client'

import { useEffect, useRef, useState } from 'react'

interface Photo { src: string; alt?: string }
export interface PkgOption { name: string; price: number; label: string; includes?: string[] }

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const FIELD = 'h-14 w-full rounded-2xl bg-white/[0.07] px-4 text-[17px] text-white outline-none ring-1 ring-inset ring-white/10 transition placeholder:text-white/35 focus:bg-white/[0.1] focus:ring-2 focus:ring-[#ffd60a]'
// Cursores de flecha para avanzar / regresar con un clic en los costados
const arrowCursor = (d: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><circle cx='28' cy='28' r='26' fill='white' fill-opacity='.94'/><path d='${d}' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>`)}") 28 28`
const CUR_NEXT = arrowCursor('M21 28h14m-6-7 7 7-7 7')
const CUR_PREV = arrowCursor('M35 28H21m6-7-7 7 7 7')
const DOCK_FIELD = 'h-12 w-full rounded-full bg-white/10 px-5 text-[16px] text-white outline-none ring-1 ring-inset ring-white/15 transition placeholder:text-white/40 focus:bg-white/[0.14] focus:ring-2 focus:ring-[#ffd60a]'
const digits = (v: string) => v.replace(/\D/g, '').length
export interface SlidesProps {
  slug: string; title: string; subtitle: string | null; organizer: string | null; description: string | null
  when: string; time: string; location: string | null; fromLabel: string
  flyer: string | null; gallery: Photo[]; packages: PkgOption[]
  closed: boolean; spotsLeft: number | null; cancelado: boolean
}

const CSS = () => `
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
.es-root.cur-next{cursor:${CUR_NEXT},e-resize}
.es-root.cur-prev{cursor:${CUR_PREV},w-resize}
.es-root.cur-next button,.es-root.cur-prev button,.es-root.cur-next input,.es-root.cur-prev input{cursor:revert}
.es-scroll{scrollbar-width:none}.es-scroll::-webkit-scrollbar{display:none}
@keyframes es-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes es-pop{from{opacity:0;transform:scale(.94) translateY(24px)}to{opacity:1;transform:none}}
@keyframes es-kb{from{transform:scale(1.1)}to{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.es-panel,.es-panel [data-a],.es-tile,.es-tile img,.es-bg img,.es-kb{animation:none!important;transition:none!important}.es-panel:not(.on) [data-a],.es-panel:not(.on) .es-tile{opacity:1}}
`

export function EventSlides(p: SlidesProps) {
  const photoPanels = p.gallery.length >= 5 ? [p.gallery.slice(0, 5), p.gallery.slice(5, 10)].filter(g => g.length >= 3) : []
  const captions = ['Una mañana llena de energía', 'Corre, disfruta y haz que cada paso cuente']
  // La historia es también el registro: cada panel le pide al corredor una sola cosa y el último cierra y cobra
  const story = ['hero', ...(photoPanels[0] ? ['fotos0'] : []), 'info', ...(photoPanels[1] ? ['fotos1'] : [])]
  const TASKS = ['nombre', 'telefono', 'correo', 'talla'] as const
  type Task = typeof TASKS[number]
  const taskOf: Record<string, Task> = {}
  story.forEach((n, i) => { if (TASKS[i]) taskOf[n] = TASKS[i] })
  const extraTasks = TASKS.filter(t => !Object.values(taskOf).includes(t))
  const panels = [...story, 'cierre']
  const last = panels.length - 1

  const [idx, setIdx] = useState(p.cancelado ? last : 0)
  const [bg, setBg] = useState(0)
  const [zone, setZone] = useState<'next' | 'prev' | null>(null)
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
  const errs: Record<Task, string> = {
    nombre: form.full_name.trim().length < 3 ? 'Escribe tu nombre completo' : '',
    telefono: digits(form.phone) < 10 ? 'Escribe un teléfono de 10 dígitos' : '',
    correo: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? 'Escribe un correo válido' : '',
    talla: '',
  }
  const required = (t: Task | undefined) => !t || !errs[t]
  const valid = (name: string) => name === 'cierre' ? !(errs.nombre || errs.telefono || errs.correo) : required(taskOf[name])

  // Avanzar se bloquea en el primer panel con su dato pendiente
  const go = (n: number) => {
    const target = Math.min(Math.max(n, 0), last)
    for (let i = idx; i < target; i++) if (!valid(panels[i])) { setShowErr(true); setIdx(i); return }
    setIdx(target)
  }

  async function pay() {
    const bad = story.findIndex(n => !required(taskOf[n]))
    if (bad >= 0) { setShowErr(true); setIdx(bad); return }
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

  // Con mouse: el costado derecho avanza y el izquierdo regresa (no en formularios ni controles)
  function zoneAt(e: React.MouseEvent): 'next' | 'prev' | null {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return null
    if ((e.target as HTMLElement).closest('input,select,textarea,button,a,label,nav,[data-nonav]')) return null
    const x = e.clientX / window.innerWidth
    if (x > 0.7 && idx < last) return 'next'
    if (x < 0.3 && idx > 0) return 'prev'
    return null
  }

  function onWheel(e: React.WheelEvent) {
    if (lock.current || Math.abs(e.deltaY) < 30) return
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

  const ACCENT = 'bg-[#ffd60a] text-black'
  const primary = `h-14 w-full rounded-full ${ACCENT} text-[17px] font-semibold transition hover:brightness-105 active:scale-[.985] disabled:opacity-60`
  const eyebrow = 'text-[12px] font-semibold uppercase tracking-[0.18em] text-white/55'
  const h2 = 'text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.035em] md:text-[3.4rem]'
  const dateLine = `${p.when.replace(/^\w+,\s*/, '')}${p.time ? ' · ' + p.time : ''}`
  const tileCls = ['col-span-2 md:row-span-2', '', '', '', '']
  const card = 'overflow-hidden rounded-[26px] es-tile bg-white/5'
  const bars = (k: number) => <div className="flex flex-1 gap-1.5">{panels.map((_, n) => <span key={n} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${n <= k ? 'bg-[#ffd60a]' : 'bg-white/20'}`} />)}</div>

  // El dato que se pide en cada panel de la historia
  const sizes = (
    <div className="flex flex-wrap gap-2">
      {SIZES.map(z => <button type="button" key={z} onClick={() => setForm(f => ({ ...f, shirt_size: f.shirt_size === z ? '' : z }))} className={`h-11 min-w-12 rounded-full px-4 text-[15px] font-semibold ring-1 ring-inset transition ${form.shirt_size === z ? 'bg-[#ffd60a] text-black ring-[#ffd60a]' : 'text-white/85 ring-white/25 hover:ring-white/55'}`}>{z}</button>)}
    </div>
  )
  const cfg: Record<Task, { q: string; sub: string; input: React.ReactNode | null }> = {
    nombre: { q: '¿Cómo te llamas?', sub: 'Empecemos por tu nombre.', input: <input value={form.full_name} onChange={set('full_name')} placeholder="Nombre completo" autoComplete="name" className={DOCK_FIELD} /> },
    telefono: { q: '¿Cuál es tu WhatsApp?', sub: 'Para avisarte todo lo de la carrera.', input: <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="10 dígitos" autoComplete="tel" className={DOCK_FIELD} /> },
    correo: { q: '¿A qué correo te confirmamos?', sub: 'Ahí llegará tu confirmación.', input: <input value={form.email} onChange={set('email')} type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" className={DOCK_FIELD} /> },
    talla: { q: '¿Qué talla de playera usas?', sub: 'Toca una talla. Puedes omitirla.', input: null },
  }
  const dock = (name: string) => {
    const t = taskOf[name]
    if (!t || p.closed) return null
    const k = panels.indexOf(name)
    const c = cfg[t]
    return (
      <div data-nonav className="absolute inset-x-0 bottom-[84px] z-10 flex justify-center px-4">
        <form data-a style={{ ['--i' as string]: 6 }} onSubmit={e => { e.preventDefault(); go(k + 1) }} className="w-full max-w-xl space-y-3 rounded-[28px] bg-black/55 p-4 ring-1 ring-white/15 backdrop-blur-2xl md:p-5">
          <div className="flex items-center gap-3">{bars(k)}<span className="text-[12px] font-medium tabular-nums text-white/55">{k + 1}/{panels.length}</span></div>
          <div>
            <p className="text-[19px] font-semibold tracking-[-0.02em]">{c.q}</p>
            <p className="text-[14px] text-white/55">{c.sub}</p>
          </div>
          {name === 'hero' && p.packages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {p.packages.map(o => <button type="button" key={o.name} onClick={() => setPkg(o.name)} className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium ring-1 ring-inset transition ${pkg === o.name ? 'bg-[#ffd60a] text-black ring-[#ffd60a]' : 'text-white/80 ring-white/25 hover:ring-white/50'}`}>{o.name} · {o.label}</button>)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">{t === 'talla' ? sizes : c.input}</div>
            <button type="submit" aria-label="Continuar" className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl font-semibold transition hover:brightness-105 active:scale-95 ${ACCENT}`}>→</button>
          </div>
          {showErr && errs[t] && <p className="px-1 text-[13px] text-[#ff9f0a]">{errs[t]}</p>}
        </form>
      </div>
    )
  }

  return (
    <div ref={root} className={`es-root relative h-dvh w-full overflow-hidden bg-[#070907] text-white ${zone ? `cur-${zone}` : ''}`} onWheel={onWheel}
      onMouseMove={e => { const z = zoneAt(e); if (z !== zone) setZone(z) }}
      onMouseLeave={() => setZone(null)}
      onClick={e => { const z = zoneAt(e); if (z) go(idx + (z === 'next' ? 1 : -1)) }}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => {
        const t = touch.current; if (!t) return
        if ((e.target as HTMLElement).closest('input,select,textarea')) { touch.current = null; return }
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) go(idx + (dx < 0 ? 1 : -1))
        touch.current = null
      }}>
      <style>{CSS()}</style>

      {panels.map((name, i) => {
        const on = i === idx
        return (
          <section key={name} aria-hidden={!on} {...(!on ? { inert: true } : {})} className={`es-panel absolute inset-0 ${on ? 'on' : ''}`}
            style={{ transform: `translateX(${(i - idx) * 100}%)`, opacity: Math.abs(i - idx) > 1 ? 0 : 1 }}>

            {name === 'hero' && (
              <div className="relative flex h-full items-center justify-center px-6 pb-56 text-center md:pb-44">
                {p.gallery.map((g, k) => (
                  <div key={g.src} className={`es-bg absolute inset-0 overflow-hidden ${k === bg ? 'show opacity-100' : 'opacity-0'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,9,7,.3),rgba(7,9,7,.8)_75%)]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#070907] to-transparent" />
                <div className="relative max-w-4xl">
                  {p.organizer && <p data-a style={{ ['--i' as string]: 0 }} className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#ffd60a]">{p.organizer}</p>}
                  <h1 data-a style={{ ['--i' as string]: 1 }} className="mt-4 text-[clamp(3.6rem,13vw,9.5rem)] font-semibold leading-[.92] tracking-[-0.05em]">{p.title}</h1>
                  {p.subtitle && <p data-a style={{ ['--i' as string]: 2 }} className="mx-auto mt-4 max-w-xl text-xl text-white/80 md:text-2xl">{p.subtitle}</p>}
                  <p data-a style={{ ['--i' as string]: 3 }} className="mt-3 text-[17px] text-white/65">{dateLine}{p.location ? ` · ${p.location}` : ''}</p>
                  {p.spotsLeft !== null && p.spotsLeft > 0 && p.spotsLeft <= 50 && <p data-a style={{ ['--i' as string]: 4 }} className="mt-3 text-sm text-[#ffd60a]">Quedan {p.spotsLeft} lugares</p>}
                </div>
                {p.closed && <p className="absolute bottom-28 rounded-full bg-white/10 px-5 py-2 text-[15px] font-medium backdrop-blur-xl">Las inscripciones están cerradas</p>}
              </div>
            )}

            {(name === 'fotos0' || name === 'fotos1') && (() => {
              const k = name === 'fotos0' ? 0 : 1
              return (
                <div className="flex h-full flex-col px-4 pb-[270px] pt-16 md:px-12 md:pb-[256px] md:pt-20">
                  <div data-a style={{ ['--i' as string]: 0 }} className="mx-auto mb-4 w-full max-w-6xl">
                    <p className={eyebrow}>{p.title}</p>
                    <h2 className={`${h2} mt-1.5 !text-[1.9rem] md:!text-[2.8rem]`}>{captions[k]}</h2>
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
                <div className="es-scroll relative flex h-full items-center overflow-y-auto px-6 pb-[270px] pt-16 md:px-12 md:pb-[256px]">
                  <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:gap-14">
                    {p.flyer && (
                      <div data-a style={{ ['--i' as string]: 0 }} className="mx-auto w-full max-w-[190px] md:max-w-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.flyer} alt={`Cartel de ${p.title}`} className="max-h-[40dvh] w-full rounded-[26px] object-contain shadow-2xl shadow-black/60 md:max-h-[56dvh]" />
                      </div>
                    )}
                    <div className="space-y-5">
                      <div data-a style={{ ['--i' as string]: 1 }}>
                        <p className={eyebrow}>La carrera</p>
                        <h2 className={`${h2} mt-1.5 !text-[2rem] md:!text-[3rem]`}>Qué te espera.</h2>
                      </div>
                      {p.description && <p data-a style={{ ['--i' as string]: 2 }} className="max-w-xl whitespace-pre-line text-[16px] leading-relaxed text-white/70 md:text-lg">{p.description}</p>}
                      <dl data-a style={{ ['--i' as string]: 3 }} className="max-w-xl divide-y divide-white/10 border-y border-white/10 text-[16px]">
                        <div className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">Fecha</dt><dd className="text-right">{p.when.charAt(0).toUpperCase() + p.when.slice(1)}</dd></div>
                        <div className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">Salida</dt><dd className="text-right">{p.time}</dd></div>
                        {p.location && <div className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">Lugar</dt><dd className="text-right">{p.location}</dd></div>}
                        {p.packages.map(pk => <div key={pk.name} className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">{pk.name}</dt><dd className="text-right font-semibold text-[#ffd60a]">{pk.label}</dd></div>)}
                      </dl>
                      {!!p.packages[0]?.includes?.length && (
                        <ul data-a style={{ ['--i' as string]: 4 }} className="grid max-w-xl gap-x-6 gap-y-1.5 text-[15px] text-white/75 sm:grid-cols-2">
                          {p.packages[0].includes.map(it => <li key={it} className="flex gap-2"><span className="text-[#ffd60a]">✓</span>{it}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {name === 'cierre' && (() => {
              const photo = p.gallery.length ? p.gallery[(panels.length * 2 + 1) % p.gallery.length] : null
              return (
                <div className="grid h-full grid-rows-[24dvh_1fr] md:grid-cols-[1fr_minmax(0,560px)] md:grid-rows-1 lg:grid-cols-[1.15fr_minmax(0,620px)]">
                  <div className="relative overflow-hidden">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.src} alt={photo.alt ?? ''} className="es-kb absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070907] via-transparent to-transparent md:bg-gradient-to-l md:from-[#070907] md:via-transparent md:to-transparent" />
                  </div>
                  <div data-nonav className="es-scroll flex min-h-0 items-center overflow-y-auto px-6 pb-24 pt-2 md:px-14 md:pt-8">
                    <div className="mx-auto w-full max-w-[420px] space-y-5">
                      <div data-a style={{ ['--i' as string]: 0 }} className="space-y-4">
                        <div className="flex items-center gap-3">{bars(last)}<span className="text-[12px] font-medium tabular-nums text-white/50">{panels.length}/{panels.length}</span></div>
                        <div>
                          <h2 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[2.8rem]">Último paso.</h2>
                          <p className="mt-2 text-[17px] leading-snug text-white/60">Un par de datos más y apartas tu lugar al pagar.</p>
                        </div>
                      </div>
                      {p.closed ? <p className="rounded-2xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p> : (
                        <div data-a style={{ ['--i' as string]: 1 }} className="space-y-3">
                          {extraTasks.filter(t => t !== 'talla').map(t => <div key={t}><p className="mb-1.5 px-1 text-[13px] text-white/50">{cfg[t].q}</p>{cfg[t].input}{showErr && errs[t] && <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs[t]}</p>}</div>)}
                          {extraTasks.includes('talla') && <div><p className="mb-1.5 px-1 text-[13px] text-white/50">Talla de playera</p>{sizes}</div>}
                          <label className="block"><span className="mb-1.5 block px-1 text-[13px] text-white/50">Fecha de nacimiento</span><input value={form.birth_date} onChange={set('birth_date')} type="date" className={`${FIELD} [color-scheme:dark]`} /></label>
                          <div className="space-y-2">
                            <p className="px-1 text-[13px] text-white/50">Contacto de emergencia (opcional)</p>
                            <input value={form.emergency_name} onChange={set('emergency_name')} placeholder="Nombre del contacto" className={FIELD} />
                            <input value={form.emergency_phone} onChange={set('emergency_phone')} type="tel" placeholder="Teléfono del contacto" className={FIELD} />
                          </div>
                          <div className="divide-y divide-white/10 rounded-2xl bg-white/[0.05] px-4 text-[15px] ring-1 ring-inset ring-white/10">
                            <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Corredor</span><b className="font-medium">{form.full_name || '—'}</b></div>
                            <div className="flex justify-between gap-4 py-3"><span className="text-white/55">WhatsApp</span><span>{form.phone || '—'}</span></div>
                            <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Correo</span><span className="truncate">{form.email || '—'}</span></div>
                            {form.shirt_size && <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Playera</span><span>{form.shirt_size}</span></div>}
                            {form.birth_date && <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Nacimiento</span><span>{form.birth_date.split('-').reverse().join('/')}</span></div>}
                            {form.emergency_name && <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Emergencia</span><span className="truncate">{form.emergency_name}{form.emergency_phone ? ` · ${form.emergency_phone}` : ''}</span></div>}
                            <div className="flex justify-between gap-4 py-3"><span className="text-white/55">Paquete</span><span>{chosen?.name}</span></div>
                            <div className="flex items-baseline justify-between gap-4 py-4 text-xl"><span className="font-semibold">Total</span><b className="font-semibold text-[#ffd60a]">{chosen?.label}</b></div>
                          </div>
                          {payErr && <p className="px-1 text-[13px] text-[#ff9f0a]">{payErr}</p>}
                          <button type="button" disabled={busy} onClick={pay} className={primary}>{busy ? 'Abriendo pago…' : `Pagar ${chosen?.label}`}</button>
                          {p.cancelado && <p className="px-1 text-center text-[13px] text-white/50">El pago anterior no se completó. Puedes intentarlo de nuevo.</p>}
                          <button type="button" onClick={() => go(idx - 1)} className="mx-auto block pt-1 text-[15px] text-white/55 transition hover:text-white">‹ Atrás</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {dock(name)}
          </section>
        )
      })}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-semibold tracking-tight text-white/90 ring-1 ring-white/10 backdrop-blur-xl">{p.title}</span>
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
