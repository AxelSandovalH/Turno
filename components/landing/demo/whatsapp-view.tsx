'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCheck } from 'lucide-react'
import type { DemoPlan } from '@/lib/demo/types'
import { TypedText, usePrefersReducedMotion } from './motion'

type Phase = 'wait' | 'typing' | 'writing'

function Chat({ plan, isDay, onFinish }: { plan: DemoPlan; isDay: boolean; onFinish: () => void }) {
  const reduced = usePrefersReducedMotion()
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('wait')
  const box = useRef<HTMLDivElement>(null)
  const chat = plan.chat
  const pal = isDay ? { bg: '#efeae2', inb: '#ffffff', out: '#d9fdd3', text: '#111b21', time: '#667781' } : { bg: '#0b141a', inb: '#1f2c34', out: '#005c4b', text: '#e9edef', time: '#8696a0' }

  useEffect(() => {
    if (idx >= chat.length) { const id = setTimeout(onFinish, 3200); return () => clearTimeout(id) }
    if (phase !== 'wait') return
    const bot = chat[idx].from === 'bot'
    const id = setTimeout(() => setPhase(bot ? 'typing' : 'writing'), bot ? 600 : 800)
    return () => clearTimeout(id)
  }, [idx, phase, chat, onFinish])

  useEffect(() => {
    if (phase !== 'typing') return
    const id = setTimeout(() => setPhase('writing'), 1100)
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }) }, [idx, phase, reduced])

  const bubble = (m: DemoPlan['chat'][number], children: React.ReactNode, showTime = true) => (
    <div className={`flex ${m.from === 'bot' ? 'justify-start' : 'justify-end'}`} style={{ animation: 'qt-pop .25s ease-out both' }}>
      <div className="max-w-[84%] whitespace-pre-line rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm" style={{ background: m.from === 'bot' ? pal.inb : pal.out, color: pal.text }}>
        {children}
        {showTime && <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px]" style={{ color: pal.time }}>{m.time}{m.from === 'customer' && <CheckCheck size={12} style={{ color: '#53bdeb' }} />}</span>}
      </div>
    </div>
  )

  const current = idx < chat.length ? chat[idx] : null

  return (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: isDay ? '#e0ddd8' : '#1f1f1f' }}>
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: '#075e54' }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{plan.businessName.charAt(0)}</span>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{plan.businessName}</p><p className="text-[11px] opacity-80">{phase === 'typing' ? 'escribiendo…' : 'en línea'}</p></div>
      </div>
      <div ref={box} className="h-[400px] space-y-2 overflow-y-auto p-3" style={{ background: pal.bg }}>
        {chat.slice(0, idx).map((m, i) => <div key={i}>{bubble(m, m.text)}</div>)}
        {current && phase === 'typing' && (
          <div className="flex justify-start" style={{ animation: 'qt-pop .2s ease-out both' }}>
            <div className="flex gap-1 rounded-lg px-3 py-3 shadow-sm" style={{ background: pal.inb }}>
              {[0, 1, 2].map(d => <span key={d} className="qt-anim h-1.5 w-1.5 rounded-full" style={{ background: pal.time, animation: `qt-dot 1s ease-in-out ${d * 150}ms infinite` }} />)}
            </div>
          </div>
        )}
        {current && phase === 'writing' && bubble(current, <TypedText key={idx} text={current.text} speed={current.from === 'bot' ? 16 : 30} onDone={() => setTimeout(() => { setPhase('wait'); setIdx(v => v + 1) }, 500)} />, false)}
      </div>
    </div>
  )
}

export function WhatsAppView({ plan, isDay }: { plan: DemoPlan; isDay: boolean }) {
  const [cycle, setCycle] = useState(0)
  return <Chat key={cycle} plan={plan} isDay={isDay} onFinish={() => setCycle(c => c + 1)} />
}
