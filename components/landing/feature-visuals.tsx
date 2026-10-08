'use client'

import { useEffect, useState } from 'react'

export interface Tokens {
  text: string
  muted: string
  subtle: string
  border: string
  card: string
  accent: string
}

// Paleta WhatsApp — independiente del tema del sitio, igual que en
// whatsapp-mockup.tsx: las burbujas deben leerse como WhatsApp real.
function waPalette(isDay: boolean) {
  return isDay
    ? { chatBg: '#efeae2', inBubble: '#ffffff', outBubble: '#d9fdd3', text: '#111b21', time: '#667781' }
    : { chatBg: '#0b141a', inBubble: '#1f2c34', outBubble: '#005c4b', text: '#e9edef', time: '#8696a0' }
}

function Bubble({ from, isDay, children }: {
  from: 'in' | 'out'
  isDay: boolean
  children: React.ReactNode
}) {
  const wa = waPalette(isDay)
  return (
    <div
      style={{
        alignSelf: from === 'in' ? 'flex-start' : 'flex-end',
        maxWidth: '88%',
        background: from === 'in' ? wa.inBubble : wa.outBubble,
        color: wa.text,
        borderRadius: 10,
        borderTopLeftRadius: from === 'in' ? 2 : 10,
        borderTopRightRadius: from === 'out' ? 2 : 10,
        padding: '7px 10px',
        fontSize: 12.5,
        lineHeight: 1.45,
        whiteSpace: 'pre-line',
        boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
      }}
    >
      {children}
    </div>
  )
}

function ChatShell({ isDay, children, minHeight }: {
  isDay: boolean
  children: React.ReactNode
  minHeight: number
}) {
  const wa = waPalette(isDay)
  return (
    <div
      aria-hidden="true"
      style={{
        background: wa.chatBg,
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        justifyContent: 'flex-end',
        minHeight,
        transition: 'background .7s',
      }}
    >
      {children}
    </div>
  )
}

/** Contesta al instante — el argumento central, con la conversación real. */
export function ChatVisual({ isDay }: { isDay: boolean }) {
  return (
    <ChatShell isDay={isDay} minHeight={168}>
      <Bubble from="in" isDay={isDay}>¿Tienen espacio mañana para un corte? ✂️</Bubble>
      <Bubble from="out" isDay={isDay}>{'¡Hola Luis! 👋 Mañana tengo 11:00, 13:30 y 17:00.\n¿Cuál te acomoda?'}</Bubble>
      <Bubble from="in" isDay={isDay}>La de la 1:30</Bubble>
      <Bubble from="out" isDay={isDay}>{'✅ Agendada: mañana 1:30 pm con Carlos.'}</Bubble>
    </ChatShell>
  )
}

/** Anticipo por Stripe — link en la conversación + ventana de 20 min. */
export function DepositVisual({ isDay, t }: { isDay: boolean; t: Tokens }) {
  // Cuenta regresiva viva: arranca igual en servidor y cliente (sin mismatch
  // de hidratación) y hace loop para que la sección no se sienta muerta.
  const [secs, setSecs] = useState(20 * 60)

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(s => (s <= 18 * 60 ? 20 * 60 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-3">
      <ChatShell isDay={isDay} minHeight={84}>
        <Bubble from="out" isDay={isDay}>
          {'Para apartar tu lugar necesito un anticipo de $300. 💳 Paga aquí:'}
        </Bubble>
        <div
          style={{
            alignSelf: 'flex-end',
            maxWidth: '88%',
            background: isDay ? '#ffffff' : '#1f2c34',
            border: `1px solid ${isDay ? '#e0ddd8' : '#2a3942'}`,
            borderRadius: 10,
            padding: '7px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: '#635bff', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}
          >
            S
          </span>
          <span style={{ fontSize: 11.5, color: isDay ? '#111b21' : '#e9edef', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            checkout.stripe.com/pay/…
          </span>
        </div>
      </ChatShell>

      <div
        className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2"
        style={{ background: `${t.accent}12`, border: `1px solid ${t.accent}40` }}
      >
        <span className="text-[11.5px] leading-snug" style={{ color: t.muted }}>
          Si no paga, el horario se libera
        </span>
        <span
          className="text-[15px] font-bold tabular-nums shrink-0"
          style={{ color: t.accent, fontVariantNumeric: 'tabular-nums' }}
        >
          {mm}:{ss}
        </span>
      </div>
    </div>
  )
}

/** Recordatorio + liberación del espacio cuando el cliente no puede ir. */
export function ReminderVisual({ isDay, t }: { isDay: boolean; t: Tokens }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch">
      <div className="flex-1 min-w-0">
        <ChatShell isDay={isDay} minHeight={120}>
          <Bubble from="out" isDay={isDay}>
            {'Hola Ana 👋 Te recuerdo tu cita de mañana a las 4:00 pm.\n¿Confirmas?'}
          </Bubble>
          <Bubble from="in" isDay={isDay}>No voy a poder, disculpa</Bubble>
        </ChatShell>
      </div>
      <div
        className="sm:w-[42%] shrink-0 rounded-xl p-3.5 flex flex-col justify-center gap-2"
        style={{ background: t.card, border: `1px solid ${t.border}` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10b981' }} />
          <span className="text-[11.5px] font-medium" style={{ color: t.text }}>Espacio liberado</span>
        </div>
        <div
          className="rounded-lg px-2.5 py-2 text-[11px] leading-snug"
          style={{ background: `${t.accent}14`, color: t.accent, border: `1px dashed ${t.accent}55` }}
        >
          Mañana 16:00 · disponible
        </div>
        <span className="text-[10.5px] leading-snug" style={{ color: t.muted }}>
          Tú te enteras hoy, no mañana a las 4:05.
        </span>
      </div>
    </div>
  )
}

/** Equipo — cada quien con su propia agenda y horario. */
export function TeamVisual({ t }: { t: Tokens }) {
  const team = [
    { initials: 'CR', name: 'Carlos R.', hours: 'Mar–Sáb · 10–8', color: '#7c3aed' },
    { initials: 'DM', name: 'Diego M.',  hours: 'Lun–Vie · 9–6',  color: '#10b981' },
    { initials: 'AS', name: 'Ana S.',    hours: 'Jue–Dom · 12–9', color: '#3b82f6' },
  ]

  return (
    <div
      aria-hidden="true"
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${t.border}` }}
    >
      {team.map((m, i) => (
        <div
          key={m.initials}
          className="flex items-center gap-2.5 px-3 py-2.5"
          style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.border}` }}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: `${m.color}1f`, color: m.color }}
          >
            {m.initials}
          </span>
          <span className="text-[12px] font-medium truncate flex-1 min-w-0" style={{ color: t.text }}>
            {m.name}
          </span>
          <span
            className="text-[10px] px-2 py-1 rounded-md shrink-0 whitespace-nowrap"
            style={{ background: `${m.color}14`, color: m.color }}
          >
            {m.hours}
          </span>
        </div>
      ))}
    </div>
  )
}
