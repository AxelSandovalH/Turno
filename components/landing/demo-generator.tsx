'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import type { Tokens } from './feature-visuals'
import type { DemoPlan } from '@/lib/demo/types'
import { DemoStyles, TypedText, usePrefersReducedMotion } from './demo/motion'
import { GeneratingStage, RefineOverlay } from './demo/generating-stage'
import { saveDemoHandoff } from '@/lib/demo/handoff'
import { PublicLinkView } from './demo/public-link-view'
import { SystemView } from './demo/system-view'
import { WhatsAppView } from './demo/whatsapp-view'

interface Props { t: Tokens; isDay: boolean }

const EXAMPLES = [
  'Barbería con 3 barberos en Cabo San Lucas. Cortes, barba y diseño.',
  'Consultorio dental: limpiezas, ortodoncia y blanqueamiento.',
  'Taquería con servicio a domicilio y para recoger.',
  'Spa con masajes, faciales y paquetes para parejas.',
]
type Phase = 'idle' | 'erasing' | 'working' | 'result'
type View = 'link' | 'sistema' | 'whatsapp'
const MIN_WORKING_MS = 4200
const nowMs = () => Date.now()

export function DemoGenerator({ t, isDay }: Props) {
  const reduced = usePrefersReducedMotion()
  const [text, setText] = useState('')
  const [shown, setShown] = useState('')           // lo que se ve en el cuadro mientras se borra
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<DemoPlan | null>(null)
  const [view, setView] = useState<View>('link')
  const busy = useRef(false)
  // La IA sigue conversando después de la demo: el visitante pide ajustes y la demo se actualiza
  const [version, setVersion] = useState(0)
  const [refining, setRefining] = useState(false)
  const [refineInput, setRefineInput] = useState('')
  const [log, setLog] = useState<{ role: 'user' | 'ai'; text: string; fresh?: boolean }[]>([])

  async function generate(description = text) {
    if (busy.current || description.trim().length < 15) return
    busy.current = true
    setError(''); setText(description); setShown(description)

    // La petición sale de inmediato; la animación corre en paralelo y dura al menos MIN_WORKING_MS
    const started = nowMs()
    const request = fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error ?? 'No pudimos armar la demo.')
        return data.plan as DemoPlan
      })
    request.catch(() => {})

    // 1) el prompt se borra letra por letra
    setPhase('erasing')
    if (!reduced) {
      let left = description.length
      await new Promise<void>(resolve => {
        const step = Math.max(2, Math.ceil(description.length / 22))
        const id = setInterval(() => {
          left = Math.max(0, left - step)
          setShown(description.slice(0, left))
          if (left === 0) { clearInterval(id); resolve() }
        }, 35)
      })
      await new Promise(r => setTimeout(r, 250))
    }

    // 2) trabaja la IA: logo de QuickTurno
    setPhase('working')
    try {
      const result = await request
      const wait = Math.max(0, MIN_WORKING_MS - (nowMs() - started))
      if (wait) await new Promise(r => setTimeout(r, wait))
      setPlan(result); setView('link'); setPhase('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos armar la demo.')
      setShown(description); setPhase('idle')   // se restaura el texto para que pueda reintentar
    } finally {
      busy.current = false
    }
  }

  async function refine(instruction = refineInput) {
    const ask = instruction.trim()
    if (!plan || refining || ask.length < 3) return
    setRefineInput(''); setRefining(true)
    setLog(l => [...l.map(m => ({ ...m, fresh: false })), { role: 'user', text: ask }])
    const started = nowMs()
    try {
      const res = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'refine', plan, instruction: ask, description: text }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No pude aplicar ese cambio.')
      const wait = Math.max(0, 1800 - (nowMs() - started))
      if (wait) await new Promise(r => setTimeout(r, wait))
      setPlan(data.plan as DemoPlan); setVersion(v => v + 1)
      setLog(l => [...l, { role: 'ai', text: data.note || 'Listo, ya lo cambié.', fresh: true }])
    } catch (err) {
      setLog(l => [...l, { role: 'ai', text: err instanceof Error ? err.message : 'No pude aplicar ese cambio.', fresh: true }])
    } finally {
      setRefining(false)
    }
  }

  function reset() { setPlan(null); setText(''); setShown(''); setError(''); setPhase('idle'); setLog([]); setRefineInput(''); setVersion(0) }

  // Al terminar de generar, la vista de resultados queda a la vista
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (phase === 'result') resultRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }) }, [phase, reduced])

  const tabs: { id: View; label: string }[] = [{ id: 'link', label: 'Tu link público' }, { id: 'sistema', label: 'Tu sistema' }, { id: 'whatsapp', label: 'Tu WhatsApp' }]
  const inputVisible = phase === 'idle' || phase === 'erasing'

  return (
    <section id="demo" style={{ borderTop: `1px solid ${t.border}` }}>
      <DemoStyles />
      <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: t.accent }}><Sparkles size={14} /> Pruébalo con tu negocio</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: t.text, letterSpacing: '-0.03em' }}>Cuéntanos tu negocio y míralo funcionando</h2>
          <p className="mt-3 text-sm sm:text-base" style={{ color: t.muted }}>Escribe qué haces y en segundos armamos tu link público de reservas, tu sistema y tu conversación de WhatsApp.</p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          {inputVisible && (
            <div style={{ animation: 'qt-fade-up .4s ease-out both' }}>
              <textarea
                value={phase === 'erasing' ? shown : text} onChange={e => setText(e.target.value)} maxLength={600} rows={3} readOnly={phase === 'erasing'}
                placeholder="Ej. Tengo una barbería en Cabo San Lucas con 3 barberos. Hacemos cortes, barba y diseños."
                className="w-full resize-none rounded-2xl border p-4 text-sm outline-none transition-colors focus:border-[#7c3aed]"
                style={{ background: t.card, borderColor: phase === 'erasing' ? t.accent : t.border, color: t.text }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 transition-opacity duration-300" style={{ opacity: phase === 'erasing' ? 0 : 1, pointerEvents: phase === 'erasing' ? 'none' : 'auto' }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} type="button" onClick={() => generate(ex)}
                    className="rounded-full border px-3 py-1.5 text-xs transition-opacity hover:opacity-80" style={{ borderColor: t.border, color: t.muted }}>
                    {ex.split('.')[0]}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => generate()} disabled={phase !== 'idle' || text.trim().length < 15}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 sm:w-auto"
                style={{ background: t.accent }}>
                Crear mi demo <ArrowRight size={16} />
              </button>
              {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
            </div>
          )}
          {phase === 'working' && <GeneratingStage isDay={isDay} accent={t.accent} />}
        </div>

        {phase === 'result' && plan && (
          <div ref={resultRef} className="mt-4 scroll-mt-24" style={{ animation: 'qt-fade-up .6s ease-out both' }}>
            <p className="text-center text-sm font-medium" style={{ color: t.text }}>Así se vería <span style={{ color: plan.accent }}>{plan.businessName}</span> en QuickTurno</p>
            <div className="my-6 flex flex-wrap justify-center gap-2">
              {tabs.map(tab => (
                <button key={tab.id} type="button" onClick={() => setView(tab.id)} className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  style={view === tab.id ? { background: t.accent, color: '#fff' } : { border: `1px solid ${t.border}`, color: t.muted }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div key={`${view}-${version}`} className="relative" style={{ animation: 'qt-fade-up .4s ease-out both' }}>
              {view === 'link' && <PublicLinkView plan={plan} isDay={isDay} />}
              {view === 'sistema' && <SystemView plan={plan} isDay={isDay} />}
              {view === 'whatsapp' && <WhatsAppView plan={plan} isDay={isDay} />}
              {refining && <RefineOverlay isDay={isDay} accent={plan.accent} />}
            </div>

            {/* La IA sigue contigo: ajustes en vivo hasta que decidas publicar */}
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border p-4 sm:p-5" style={{ background: t.card, borderColor: `${t.accent}55` }}>
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: t.text }}><Sparkles size={15} style={{ color: t.accent }} /> ¿Quieres cambiar algo? Dile a la IA</p>
              {log.length > 0 && (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto" aria-live="polite">
                  {log.slice(-6).map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'qt-fade-up .3s ease-out both' }}>
                      <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm" style={m.role === 'user' ? { background: t.accent, color: '#fff' } : { background: isDay ? '#efeee9' : '#1a1a1a', color: t.text }}>
                        {m.role === 'ai' && m.fresh ? <TypedText text={m.text} speed={14} /> : m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!refining && log.length < 2 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Agrega un servicio nuevo', 'Cambia los precios', 'Cambia el color de mi marca', 'Cambia el nombre del negocio'].map(s => (
                    <button key={s} type="button" onClick={() => setRefineInput(s + ': ')} className="rounded-full border px-3 py-1.5 text-xs transition-opacity hover:opacity-80" style={{ borderColor: t.border, color: t.muted }}>{s}</button>
                  ))}
                </div>
              )}
              <form onSubmit={e => { e.preventDefault(); refine() }} className="mt-3 flex items-end gap-2">
                <input value={refineInput} onChange={e => setRefineInput(e.target.value)} maxLength={300} disabled={refining}
                  placeholder="Ej. agrega un servicio de tinte a $350 y cambia el color a verde"
                  className="min-h-[44px] flex-1 rounded-xl border px-3.5 text-sm outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60" style={{ background: isDay ? '#fff' : '#0c0c0c', borderColor: t.border, color: t.text }} />
                <button type="submit" disabled={refining || refineInput.trim().length < 3} aria-label="Aplicar cambio" className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40" style={{ background: t.accent }}><ArrowUp size={18} /></button>
              </form>
            </div>

            <p className="mx-auto mt-6 max-w-md text-center text-xs" style={{ color: t.muted }}>Datos de ejemplo armados a partir de tu descripción.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a href={`/register?type=${plan.segment}&demo=1`} onClick={() => saveDemoHandoff(plan, text)} className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]" style={{ background: t.accent }}>
                Publicar mi sitio con esto <ArrowRight size={16} />
              </a>
              <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-medium" style={{ borderColor: t.border, color: t.muted }}>
                <RotateCcw size={14} /> Probar con otro negocio
              </button>
              <p className="basis-full text-center text-xs" style={{ color: t.muted }}>Creas tu cuenta con tu correo, empiezas 7 días gratis y la IA sigue armando tu sitio contigo.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
