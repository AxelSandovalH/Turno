'use client'

import { useEffect, useRef, useState } from 'react'

interface Photo { src: string; alt?: string }
export interface PkgOption { name: string; price: number; label: string; includes?: string[]; kind?: 'race' | 'donation' }

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
  closed: boolean; raceFull: boolean; currency: string; spotsLeft: number | null; cancelado: boolean
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
  const racePkgs = p.packages.filter(o => o.kind !== 'donation')
  const donPkgs = p.packages.filter(o => o.kind === 'donation')
  const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: p.currency === 'usd' ? 'USD' : 'MXN', maximumFractionDigits: 0 })
  // Modalidad: correr (con un extra de donación opcional) o solo donar
  const [mode, setMode] = useState<'run' | 'donate'>(racePkgs.length && !(p.raceFull && donPkgs.length) ? 'run' : 'donate')
  const [donSel, setDonSel] = useState('')
  const [donCustom, setDonCustom] = useState('')
  const [extraSel, setExtraSel] = useState(0)
  const [extraCustom, setExtraCustom] = useState('')
  // La historia es también el registro: cada panel le pide al corredor una sola cosa y el último cierra y cobra
  const story = ['hero', ...(photoPanels[0] ? ['fotos0'] : []), 'info', ...(photoPanels[1] ? ['fotos1'] : [])]
  const TASKS = ['nombre', 'telefono', 'correo', mode === 'donate' ? 'monto' : 'talla'] as const
  type Task = 'nombre' | 'telefono' | 'correo' | 'talla' | 'monto'
  const taskOf: Record<string, Task> = {}
  story.forEach((n, i) => { if (TASKS[i]) taskOf[n] = TASKS[i] })
  const extraTasks = TASKS.filter(t => !Object.values(taskOf).includes(t))
  const panels = [...story, 'cierre']
  const last = panels.length - 1

  const [idx, setIdx] = useState(p.cancelado ? last : 0)
  const [bg, setBg] = useState(0)
  const [tick, setTick] = useState(0)
  // Teclado del celular: el alto real es el del viewport visual y, con el teclado abierto, el contenido se compacta (no solo se desplaza)
  const [vvh, setVvh] = useState(0)
  const [vvTop, setVvTop] = useState(0)
  const [kb, setKb] = useState(false)
  const [kbInset, setKbInset] = useState(0)
  const baseH = useRef(0)
  const [zone, setZone] = useState<'next' | 'prev' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const [form, setForm] = useState({ full_name: '', phone: '', email: '', birth_date: '', shirt_size: '', emergency_name: '', emergency_phone: '' })
  const [pkg, setPkg] = useState(racePkgs[0]?.name ?? '')
  const [showErr, setShowErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payErr, setPayErr] = useState('')
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)
  const [birthText, setBirthText] = useState('')
  // Fecha de nacimiento con máscara dd/mm/aaaa (el selector nativo se ve roto en iPhone)
  const onBirth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 8)
    setBirthText([d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/'))
    const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yy = +d.slice(4, 8)
    const ok = d.length === 8 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yy >= 1920 && yy <= new Date().getFullYear()
    setForm(f => ({ ...f, birth_date: ok ? `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : '' }))
  }
  const chosen = racePkgs.find(x => x.name === pkg) ?? racePkgs[0]
  const donPkg = donPkgs.find(o => o.name === donSel)
  const donAmount = mode === 'donate' ? (donPkg ? donPkg.price : donSel === 'otro' ? Math.round(Number(donCustom) || 0) : 0) : 0
  const extraAmount = mode === 'run' ? (extraSel === -1 ? Math.round(Number(extraCustom) || 0) : extraSel) : 0
  const total = mode === 'donate' ? donAmount : (chosen?.price ?? 0) + extraAmount
  const extraErr = mode === 'run' && extraSel === -1 && (extraAmount < 20 || extraAmount > 50000) ? 'El monto va de $20 a $50,000' : ''
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const errs: Record<Task, string> = {
    nombre: form.full_name.trim().length < 3 ? 'Escribe tu nombre completo' : '',
    telefono: digits(form.phone) < 10 ? 'Escribe un teléfono de 10 dígitos' : '',
    correo: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? 'Escribe un correo válido' : '',
    talla: '',
    monto: mode === 'donate' && (donAmount < 20 || donAmount > 50000) ? 'Elige un monto (de $20 a $50,000)' : '',
  }
  const required = (t: Task | undefined) => !t || !errs[t]
  const valid = (name: string) => name === 'cierre' ? !(errs.nombre || errs.telefono || errs.correo || errs.monto) : required(taskOf[name])

  // Avanzar se bloquea en el primer panel con su dato pendiente
  const go = (n: number) => {
    const target = Math.min(Math.max(n, 0), last)
    for (let i = idx; i < target; i++) if (!valid(panels[i])) { setShowErr(true); setIdx(i); return }
    setIdx(target)
  }

  async function pay() {
    const bad = story.findIndex(n => !required(taskOf[n]))
    if (bad >= 0) { setShowErr(true); setIdx(bad); return }
    if (extraErr) { setPayErr(extraErr); return }
    setBusy(true); setPayErr('')
    try {
      const body = { slug: p.slug, ...form, mode, package: mode === 'run' ? chosen?.name : donPkg?.name ?? 'otro', donation_amount: mode === 'run' ? extraAmount : donAmount }
      const res = await fetch('/api/events/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok || !data.url) { setPayErr(data.error ?? 'No se pudo completar la inscripción'); setBusy(false); return }
      window.location.assign(data.url)
    } catch { setPayErr('Sin conexión, intenta de nuevo'); setBusy(false) }
  }

  // Portada: el fondo rota entre las fotos
  useEffect(() => {
    if (p.gallery.length < 2) return
    const t = setInterval(() => setBg(b => (b + 1) % p.gallery.length), 4500)
    return () => clearInterval(t)
  }, [p.gallery.length])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    baseH.current = Math.max(window.innerHeight, vv.height)
    const sync = () => {
      baseH.current = Math.max(baseH.current, vv.height)
      setVvh(vv.height)
      setVvTop(vv.offsetTop)
      setKb(baseH.current - vv.height > 120)
    }
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => { vv.removeEventListener('resize', sync); vv.removeEventListener('scroll', sync) }
  }, [])

  // La página nunca se desplaza: iOS mueve el viewport visual y el contenedor lo sigue, sin forzar el scroll
  useEffect(() => {
    const h = document.documentElement, b = document.body
    const prev = [h.style.overflow, b.style.overflow, h.style.overscrollBehavior]
    h.style.overflow = 'hidden'; b.style.overflow = 'hidden'; h.style.overscrollBehavior = 'none'
    return () => { h.style.overflow = prev[0]; b.style.overflow = prev[1]; h.style.overscrollBehavior = prev[2] }
  }, [])

  // Celular: en vez del mosaico, un bloque grande que va alternando las fotos
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 3200)
    return () => clearInterval(t)
  }, [])

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
  const primary = `h-14 max-md:h-12 w-full rounded-full ${ACCENT} text-[17px] font-semibold transition hover:brightness-105 active:scale-[.985] disabled:opacity-60`
  const eyebrow = 'text-[12px] font-semibold uppercase tracking-[0.18em] text-white/55'
  const h2 = 'text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.035em] md:text-[3.4rem]'
  const dayLine = p.when.replace(/^\w+,\s*/, '').replace(/ de \d{4}$/, '')
  const dateLine = `${p.when.replace(/^\w+,\s*/, '')}${p.time ? ' · ' + p.time : ''}`
  const tileCls = ['col-span-2 md:row-span-2', '', '', '', '']
  const card = 'overflow-hidden rounded-[26px] es-tile bg-white/5'
  const bars = (k: number) => <div className="flex flex-1 gap-1.5">{panels.map((_, n) => <span key={n} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${n <= k ? 'bg-[#ffd60a]' : 'bg-white/20'}`} />)}</div>

  // El dato que se pide en cada panel de la historia
  const sizesRow = (onPick?: () => void) => (
    <div className="grid grid-cols-6 gap-1.5 md:flex md:flex-wrap md:gap-2">
      {SIZES.map(z => <button type="button" key={z} onClick={() => { const on = form.shirt_size === z; setForm(f => ({ ...f, shirt_size: on ? '' : z })); if (!on) onPick?.() }} className={`h-11 rounded-full text-[14px] font-semibold ring-1 ring-inset transition md:min-w-12 md:px-4 md:text-[15px] ${form.shirt_size === z ? 'bg-[#ffd60a] text-black ring-[#ffd60a]' : 'text-white/85 ring-white/25 hover:ring-white/55'}`}>{z}</button>)}
    </div>
  )
  const sizes = sizesRow()
  const chip = (on: boolean) => `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] font-medium ring-1 ring-inset transition ${on ? 'bg-[#ffd60a] text-black ring-[#ffd60a]' : 'text-white/80 ring-white/25 hover:ring-white/50'}`
  const donChips = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {donPkgs.map(o => <button type="button" key={o.name} onClick={() => setDonSel(o.name)} className={chip(donSel === o.name)}>{o.name} · {o.label}</button>)}
        <button type="button" onClick={() => setDonSel('otro')} className={chip(donSel === 'otro')}>Otro monto</button>
      </div>
      {donSel === 'otro' && <input value={donCustom} onChange={e => setDonCustom(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="Monto en pesos (mínimo $20)" className={DOCK_FIELD} />}
    </div>
  )
  const cfg: Record<Task, { q: string; sub: string; input: React.ReactNode | null }> = {
    nombre: { q: '¿Cómo te llamas?', sub: 'Empecemos por tu nombre.', input: <input value={form.full_name} onChange={set('full_name')} placeholder="Nombre completo" autoComplete="name" className={DOCK_FIELD} /> },
    telefono: { q: '¿Cuál es tu WhatsApp?', sub: 'Para avisarte todo lo de la carrera.', input: <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="10 dígitos" autoComplete="tel" className={DOCK_FIELD} /> },
    correo: { q: '¿A qué correo te confirmamos?', sub: 'Ahí llegará tu confirmación.', input: <input value={form.email} onChange={set('email')} type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" className={DOCK_FIELD} /> },
    talla: { q: '¿Qué talla de playera usas?', sub: 'Toca una talla o presiona Omitir.', input: null },
    monto: { q: '¿Con cuánto quieres ayudar?', sub: 'Elige un monto o escribe el tuyo.', input: donChips },
  }
  const dock = (name: string) => {
    const t = taskOf[name]
    if (!t || p.closed) return null
    const k = panels.indexOf(name)
    const c = cfg[t]
    return (
      <div data-nonav style={{ bottom: kb ? 12 + kbInset : 84 }} className="absolute inset-x-0 z-10 flex justify-center px-4 transition-[bottom] duration-300 ease-out">
        <form data-a style={{ ['--i' as string]: 6 }} onSubmit={e => { e.preventDefault(); go(k + 1) }} className="w-full max-w-xl space-y-3 rounded-[28px] bg-black/55 p-4 ring-1 ring-white/15 backdrop-blur-2xl md:p-5">
          {!kb && <div className="flex items-center gap-3">{bars(k)}<span className="text-[12px] font-medium tabular-nums text-white/55">{k + 1}/{panels.length}</span></div>}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[19px] font-semibold tracking-[-0.02em]">{c.q}</p>
              <p className="text-[14px] text-white/55 max-md:hidden">{c.sub}</p>
            </div>
            {t === 'talla' && <button type="submit" className={`shrink-0 rounded-full px-4 py-1.5 text-[14px] font-semibold transition ${form.shirt_size ? ACCENT : 'text-white/85 ring-1 ring-inset ring-white/30 hover:bg-white/10'}`}>{form.shirt_size ? 'Continuar' : 'Omitir'}</button>}
          </div>
          {name === 'hero' && !kb && racePkgs.length > 0 && donPkgs.length > 0 && (
            <div className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1 text-[14px] font-semibold">
              <button type="button" disabled={p.raceFull} onClick={() => setMode('run')} className={`rounded-full py-2 transition disabled:opacity-40 ${mode === 'run' ? 'bg-white text-black' : 'text-white/75'}`}>{p.raceFull ? 'Lugares agotados' : 'Voy a correr'}</button>
              <button type="button" onClick={() => setMode('donate')} className={`rounded-full py-2 transition ${mode === 'donate' ? 'bg-white text-black' : 'text-white/75'}`}>Solo quiero donar</button>
            </div>
          )}
          {name === 'hero' && !kb && mode === 'run' && racePkgs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {racePkgs.map(o => <button type="button" key={o.name} onClick={() => setPkg(o.name)} className={chip(pkg === o.name)}>{o.name} · {o.label}</button>)}
            </div>
          )}
          {t === 'talla'
            ? sizesRow(() => setTimeout(() => go(k + 1), 260))
            : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">{c.input}</div>
                <button type="submit" aria-label="Continuar" className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl font-semibold transition hover:brightness-105 active:scale-95 ${ACCENT}`}>→</button>
              </div>
            )}
          {showErr && errs[t] && <p className="px-1 text-[13px] text-[#ff9f0a]">{errs[t]}</p>}
        </form>
      </div>
    )
  }

  return (
    <div ref={root} className={`es-root fixed left-0 top-0 h-dvh w-full overflow-hidden bg-[#070907] text-white ${zone ? `cur-${zone}` : ''}`} onWheel={onWheel}
      style={vvh ? { height: vvh, top: vvTop, ['--vh' as string]: `${vvh / 100}px` } : { ['--vh' as string]: '1dvh' }}
      onBlurCapture={() => {
        // Al soltar el foco el layout vuelve de inmediato (sin esperar al teclado)
        setTimeout(() => { if (!document.activeElement?.matches('input,select,textarea')) { setKb(false); setVvh(0); setVvTop(0); setKbInset(0) } }, 120)
      }}
      onFocusCapture={e => {
        const el = e.target as HTMLElement
        // En cuanto se toca un campo en celular el layout se compacta, sin esperar a que el teclado termine de subir
        if (el.matches('input,select,textarea') && window.matchMedia('(pointer: coarse)').matches) {
          setKb(true); setVvh(v => v || Math.round(window.innerHeight * 0.58))
          const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
          setKbInset(ios ? 8 : 0)
        }
        const sc = el.matches('input,select,textarea') ? el.closest<HTMLElement>('.es-scroll') : null
        // Solo se desplaza el formulario interno; la pantalla principal nunca se mueve
        if (sc) setTimeout(() => { const r = el.getBoundingClientRect(), c = sc.getBoundingClientRect(); sc.scrollTo({ top: sc.scrollTop + (r.top - c.top) - c.height / 3, behavior: 'smooth' }) }, 320)
        if (root.current) root.current.scrollTop = 0
      }}
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
              <div className="relative h-full">
                <div style={{ ['--hb' as string]: `${kb ? 150 + kbInset : 300}px` }} className="absolute inset-x-0 bottom-[var(--hb)] top-0 overflow-hidden transition-[bottom] duration-300 ease-out md:inset-0">
                  {p.gallery.map((g, k) => (
                    <div key={g.src} className={`es-bg absolute inset-0 overflow-hidden ${k === bg ? 'show opacity-100' : 'opacity-0'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.src} alt="" className="h-full w-full object-cover max-md:object-[center_20%]" />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,9,7,.3),rgba(7,9,7,.8)_75%)] max-md:hidden" />
                  <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#070907] via-[#070907]/70 to-transparent md:h-1/2 md:via-transparent" />
                </div>
                <div style={{ ['--hb' as string]: `${kb ? 150 + kbInset : 300}px` }} className="absolute inset-x-0 bottom-[var(--hb)] px-6 text-center transition-[bottom] duration-300 ease-out md:inset-0 md:flex md:items-center md:justify-center md:pb-44">
                  <div className="relative mx-auto max-w-4xl pb-3 md:pb-0">
                    {p.organizer && !kb && <p data-a style={{ ['--i' as string]: 0 }} className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#ffd60a] md:text-[13px]">{p.organizer}</p>}
                    <h1 data-a style={{ ['--i' as string]: 1 }} className={`font-semibold leading-[.95] tracking-[-0.05em] ${kb ? 'text-[2.6rem]' : 'mt-1 text-[3.6rem] md:mt-4 md:text-[clamp(3.6rem,13vw,9.5rem)]'}`}>{p.title}</h1>
                    {p.subtitle && !kb && <p data-a style={{ ['--i' as string]: 2 }} className="mx-auto mt-4 max-w-xl text-xl text-white/80 max-md:hidden md:text-2xl">{p.subtitle}</p>}
                    {!kb && <p data-a style={{ ['--i' as string]: 3 }} className="mt-2 text-[16px] text-white/75 md:mt-3 md:text-[17px]">{dateLine}<span className="max-md:hidden">{p.location ? ` · ${p.location}` : ''}</span></p>}
                    {p.spotsLeft !== null && p.spotsLeft > 0 && p.spotsLeft <= 50 && !kb && <p data-a style={{ ['--i' as string]: 4 }} className="mt-2 text-sm text-[#ffd60a]">Quedan {p.spotsLeft} lugares</p>}
                  </div>
                </div>
                {p.closed && <p className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-[15px] font-medium backdrop-blur-xl">Las inscripciones están cerradas</p>}
              </div>
            )}

            {(name === 'fotos0' || name === 'fotos1') && (() => {
              const k = name === 'fotos0' ? 0 : 1
              return (
                <div style={{ ['--pb' as string]: `${kb ? 160 + kbInset : 262}px` }} className="flex h-full flex-col px-4 pb-[var(--pb)] pt-16 transition-[padding] duration-300 ease-out md:px-12 md:pb-[256px] md:pt-20">
                  <div data-a style={{ ['--i' as string]: 0 }} className={`mx-auto mb-4 w-full max-w-6xl ${kb ? 'hidden' : ''}`}>
                    <p className={eyebrow}>{p.title}</p>
                    <h2 className={`${h2} mt-1.5 !text-[1.9rem] md:!text-[2.8rem]`}>{captions[k]}</h2>
                  </div>
                  <div style={{ ['--i' as string]: 0 }} className="es-tile relative mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden rounded-[28px] bg-white/5 md:hidden">
                    {photoPanels[k].map((g, j) => (
                      <div key={g.src} className={`absolute inset-0 transition-opacity duration-1000 ${j === tick % photoPanels[k].length ? 'opacity-100' : 'opacity-0'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.src} alt={g.alt ?? ''} className={`h-full w-full object-cover ${j === tick % photoPanels[k].length ? 'es-kb' : ''}`} />
                      </div>
                    ))}
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                      {photoPanels[k].map((g, j) => <span key={g.src} className={`h-[5px] rounded-full bg-white transition-all duration-500 ${j === tick % photoPanels[k].length ? 'w-5 opacity-100' : 'w-[5px] opacity-50'}`} />)}
                    </div>
                  </div>
                  <div className="mx-auto hidden min-h-0 w-full max-w-6xl flex-1 gap-4 md:grid md:grid-cols-4 md:grid-rows-2">
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
                <div style={{ ['--pb' as string]: `${kb ? 150 + kbInset : 244}px` }} className="relative flex h-full items-center gap-4 px-5 pb-[var(--pb)] pt-14 transition-[padding] duration-300 ease-out md:hidden">
                  <div data-a style={{ ['--i' as string]: 0 }} className="flex h-full min-h-0 w-[65%] shrink-0 items-center">
                    {p.flyer && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.flyer} alt={`Cartel de ${p.title}`} className="max-h-full max-w-full rounded-[20px] object-contain object-left shadow-2xl shadow-black/70" />
                    )}
                  </div>
                  <div data-a style={{ ['--i' as string]: 1 }} className="flex min-w-0 flex-1 flex-col justify-center gap-4">
                    <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Fecha</p><p className="text-[17px] font-semibold leading-tight">{dayLine}</p></div>
                    <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Salida</p><p className="text-[17px] font-semibold leading-tight">{p.time}</p></div>
                    {p.location && <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Lugar</p><p className="text-[15px] font-semibold leading-tight">{p.location}</p></div>}
                  </div>
                </div>
                <div className="es-scroll relative flex h-full items-center overflow-y-auto px-6 pb-[270px] pt-16 max-md:hidden md:px-12 md:pb-[256px]">
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
                        {racePkgs.map(pk => <div key={pk.name} className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">Inscripción {pk.name}</dt><dd className="text-right font-semibold text-[#ffd60a]">{pk.label}</dd></div>)}
                        {donPkgs.length > 0 && <div className="flex justify-between gap-6 py-2.5"><dt className="text-white/50">Donación</dt><dd className="text-right font-semibold text-[#ffd60a]">desde {money(Math.min(...donPkgs.map(o => o.price)))}</dd></div>}
                      </dl>
                      {!!racePkgs[0]?.includes?.length && (
                        <ul data-a style={{ ['--i' as string]: 4 }} className="grid max-w-xl gap-x-6 gap-y-1.5 text-[15px] text-white/75 sm:grid-cols-2">
                          {racePkgs[0].includes.map(it => <li key={it} className="flex gap-2"><span className="text-[#ffd60a]">✓</span>{it}</li>)}
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
                <div className={`grid h-full md:grid-cols-[1fr_minmax(0,560px)] md:grid-rows-1 lg:grid-cols-[1.15fr_minmax(0,620px)] ${kb ? 'grid-rows-[0px_1fr]' : 'grid-rows-[calc(var(--vh)*24)_1fr]'}`}>
                  <div className="relative overflow-hidden">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.src} alt={photo.alt ?? ''} className="es-kb absolute inset-0 h-full w-full object-cover max-md:object-[center_22%]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070907] via-transparent to-transparent md:bg-gradient-to-l md:from-[#070907] md:via-transparent md:to-transparent" />
                    <h2 className="absolute bottom-2 left-6 text-[1.9rem] font-semibold leading-[1.2] tracking-[-0.035em] md:hidden">{mode === 'donate' ? 'Gracias por ayudar.' : 'Último paso.'}</h2>
                  </div>
                  <div data-nonav style={kb ? { paddingBottom: kbInset + 12 } : undefined} className="es-scroll flex min-h-0 overflow-y-auto px-6 pb-3 pt-2 md:px-14 md:pb-24 md:pt-8">
                    <div className="m-auto w-full max-w-[420px] space-y-5 max-md:space-y-2">
                      <div data-a style={{ ['--i' as string]: 0 }} className="space-y-4">
                        <div className="flex items-center gap-3 max-md:hidden">{bars(last)}<span className="text-[12px] font-medium tabular-nums text-white/50">{panels.length}/{panels.length}</span></div>
                        <div>
                          <h2 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.035em] max-md:hidden md:text-[2.8rem]">{mode === 'donate' ? 'Gracias por ayudar.' : 'Último paso.'}</h2>
                          <p className="mt-2 text-[17px] leading-snug text-white/60 max-md:hidden">{mode === 'donate' ? 'Revisa tu aporte y completa el pago.' : 'Un par de datos más y apartas tu lugar al pagar.'}</p>
                        </div>
                      </div>
                      {p.closed ? <p className="rounded-2xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p> : (
                        <div data-a style={{ ['--i' as string]: 1 }} className="space-y-3 max-md:space-y-2">
                          {extraTasks.filter(t => t !== 'talla').map(t => <div key={t}><p className="mb-1.5 px-1 text-[13px] text-white/50">{cfg[t].q}</p>{cfg[t].input}{showErr && errs[t] && <p className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">{errs[t]}</p>}</div>)}
                          {mode === 'run' && extraTasks.includes('talla') && <div><p className="mb-1.5 px-1 text-[13px] text-white/50">Talla de playera</p>{sizes}</div>}
                          {mode === 'run' && (<>
                            <label className="block"><span className="mb-1.5 block px-1 text-[13px] text-white/50 max-md:mb-1">Fecha de nacimiento</span><input value={birthText} onChange={onBirth} inputMode="numeric" placeholder="dd/mm/aaaa" autoComplete="bday" className={`${FIELD} max-md:h-12`} /></label>
                            <div>
                              <button type="button" onClick={() => setEmergencyOpen(o => !o)} aria-expanded={emergencyOpen} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5 text-left text-[15px] max-md:py-3 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08]">
                                <span>Contacto de emergencia <span className="text-white/45">· opcional</span></span>
                                <span aria-hidden className={`text-lg text-white/60 transition-transform duration-300 ${emergencyOpen ? 'rotate-45' : ''}`}>+</span>
                              </button>
                              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${emergencyOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <div className="space-y-2 pt-2" {...(!emergencyOpen ? { inert: true } : {})}>
                                    <input value={form.emergency_name} onChange={set('emergency_name')} placeholder="Nombre del contacto" className={FIELD} />
                                    <input value={form.emergency_phone} onChange={set('emergency_phone')} type="tel" placeholder="Teléfono del contacto" className={FIELD} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            {donPkgs.length > 0 && (
                              <div>
                                <button type="button" onClick={() => setExtraOpen(o => !o)} aria-expanded={extraOpen} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5 text-left text-[15px] max-md:py-3 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08]">
                                  <span>{extraAmount > 0 ? <>Donación extra <b className="font-semibold text-[#ffd60a]">{money(extraAmount)}</b></> : <>Suma una donación <span className="text-white/45">· opcional</span></>}</span>
                                  <span aria-hidden className={`text-lg text-white/60 transition-transform duration-300 ${extraOpen ? 'rotate-45' : ''}`}>+</span>
                                </button>
                                <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${extraOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                  <div className="overflow-hidden">
                                    <div className="space-y-2 pt-2" {...(!extraOpen ? { inert: true } : {})}>
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => setExtraSel(0)} className={chip(extraSel === 0)}>Sin extra</button>
                                        {donPkgs.map(o => <button type="button" key={o.name} onClick={() => setExtraSel(o.price)} className={chip(extraSel === o.price)}>+{o.label}</button>)}
                                        <button type="button" onClick={() => setExtraSel(-1)} className={chip(extraSel === -1)}>Otro monto</button>
                                      </div>
                                      {extraSel === -1 && <input value={extraCustom} onChange={e => setExtraCustom(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="Monto en pesos" className={FIELD} />}
                                      {extraErr && <p className="text-[13px] text-[#ff9f0a]">{extraErr}</p>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>)}
                          <div className="divide-y divide-white/10 rounded-2xl bg-white/[0.05] px-4 text-[15px] max-md:text-[14px] ring-1 ring-inset ring-white/10">
                            <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">{mode === 'donate' ? 'Donante' : 'Corredor'}</span><b className="font-medium">{form.full_name || '—'}</b></div>
                            <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">WhatsApp</span><span>{form.phone || '—'}</span></div>
                            <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Correo</span><span className="truncate">{form.email || '—'}</span></div>
                            {mode === 'run' && form.shirt_size && <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Playera</span><span>{form.shirt_size}</span></div>}
                            {mode === 'run' && form.birth_date && <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Nacimiento</span><span>{form.birth_date.split('-').reverse().join('/')}</span></div>}
                            {mode === 'run' && form.emergency_name && <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Emergencia</span><span className="truncate">{form.emergency_name}{form.emergency_phone ? ` · ${form.emergency_phone}` : ''}</span></div>}
                            {mode === 'run'
                              ? <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Inscripción {chosen?.name}</span><span>{chosen ? money(chosen.price) : '—'}</span></div>
                              : <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Aporte {donPkg ? donPkg.name : ''}</span><span>{donAmount ? money(donAmount) : '—'}</span></div>}
                            {mode === 'run' && extraAmount > 0 && <div className="flex justify-between gap-4 py-3 max-md:py-1"><span className="text-white/55">Donación extra</span><span>{money(extraAmount)}</span></div>}
                            <div className="flex items-baseline justify-between gap-4 py-4 text-xl max-md:py-2"><span className="font-semibold">Total</span><b className="font-semibold text-[#ffd60a]">{money(total)}</b></div>
                          </div>
                          {payErr && <p className="px-1 text-[13px] text-[#ff9f0a]">{payErr}</p>}
                          <button type="button" disabled={busy} onClick={pay} className={primary}>{busy ? 'Abriendo pago…' : `${mode === 'donate' ? 'Donar' : 'Pagar'} ${money(total)}`}</button>
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
      <nav aria-label="Paneles" className={`absolute bottom-5 ${kb ? 'hidden' : idx === last ? 'max-md:hidden' : ''} left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/35 p-1.5 ring-1 ring-white/15 backdrop-blur-xl`}>
        <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Anterior" className="grid h-9 w-9 place-items-center rounded-full text-lg text-white/80 transition hover:bg-white/15 disabled:opacity-25">‹</button>
        <div className="flex items-center gap-1.5 px-1">
          {panels.map((n, i) => <button key={n} onClick={() => go(i)} aria-label={`Panel ${i + 1}`} className={`h-[7px] rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-white' : 'w-[7px] bg-white/35 hover:bg-white/55'}`} />)}
        </div>
        <button onClick={() => go(idx + 1)} disabled={idx === last} aria-label="Siguiente" className="grid h-9 w-9 place-items-center rounded-full text-lg text-white/80 transition hover:bg-white/15 disabled:opacity-25">›</button>
      </nav>
    </div>
  )
}
