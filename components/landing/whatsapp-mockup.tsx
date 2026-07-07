'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

interface Props {
  isDay: boolean
}

interface Msg {
  from: 'customer' | 'bot'
  text: string
  time: string
}

const CONVERSATION: Msg[] = [
  { from: 'customer', text: 'Hola! ¿Tienen espacio mañana para un corte? ✂️', time: '10:02' },
  { from: 'bot', text: '¡Hola Luis! 👋 Claro que sí. Mañana tengo estos horarios con Carlos:\n\n1️⃣ 11:00\n2️⃣ 13:30\n3️⃣ 17:00\n\n¿Cuál te acomoda?', time: '10:02' },
  { from: 'customer', text: 'La 2', time: '10:03' },
  { from: 'bot', text: '✅ ¡Listo! Tu cita quedó agendada:\n\n💈 Corte de cabello · $180\n📅 Mañana a la 1:30 pm\n👤 Con Carlos\n\nTe mando un recordatorio un día antes 😉', time: '10:03' },
]

export function WhatsappMockup({ isDay }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const msgs = gsap.utils.toArray<HTMLElement>('[data-wa-msg]')
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 1.2 })
      msgs.forEach((m, i) => {
        tl.fromTo(m,
          { opacity: 0, y: 14, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
          i === 0 ? 0 : `+=${i % 2 === 1 ? 1.1 : 0.9}` // pausa como si escribieran
        )
      })
      tl.to(msgs, { opacity: 0, duration: 0.5, delay: 3 })
    }, root)
    return () => ctx.revert()
  }, [])

  // WhatsApp palette — independiente del tema del sitio pero con contraste ajustado
  const wa = isDay
    ? { chatBg: '#efeae2', headerBg: '#008069', customerBubble: '#ffffff', botBubble: '#d9fdd3', text: '#111b21', time: '#667781', frame: '#ffffff', frameBorder: '#e0ddd8' }
    : { chatBg: '#0b141a', headerBg: '#1f2c34', customerBubble: '#1f2c34', botBubble: '#005c4b', text: '#e9edef', time: '#8696a0', frame: '#111111', frameBorder: '#262626' }

  return (
    <div
      ref={root}
      aria-hidden="true"
      style={{
        width: 330,
        borderRadius: 28,
        background: wa.frame,
        border: `1px solid ${wa.frameBorder}`,
        boxShadow: '0 24px 70px -18px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        transition: 'background .7s, border-color .7s',
      }}
    >
      {/* Header estilo WhatsApp */}
      <div style={{ background: wa.headerBg, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 99, background: '#7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
        }}>💈</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>Barbería Central</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>en línea</p>
        </div>
      </div>

      {/* Chat */}
      <div style={{
        background: wa.chatBg, padding: '16px 12px', minHeight: 380,
        display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end',
        transition: 'background .7s',
      }}>
        {CONVERSATION.map((m, i) => (
          <div
            key={i}
            data-wa-msg
            style={{
              alignSelf: m.from === 'customer' ? 'flex-start' : 'flex-end',
              maxWidth: '82%',
              background: m.from === 'customer' ? wa.customerBubble : wa.botBubble,
              color: wa.text,
              borderRadius: 10,
              borderTopLeftRadius: m.from === 'customer' ? 2 : 10,
              borderTopRightRadius: m.from === 'bot' ? 2 : 10,
              padding: '7px 10px 5px',
              fontSize: 12.5,
              lineHeight: 1.45,
              whiteSpace: 'pre-line',
              boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
              opacity: 0,
            }}
          >
            {m.text}
            <span style={{ display: 'block', fontSize: 9.5, color: m.from === 'bot' && !isDay ? 'rgba(233,237,239,0.6)' : wa.time, textAlign: 'right', marginTop: 3 }}>
              {m.time}{m.from === 'bot' ? ' ✓✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
