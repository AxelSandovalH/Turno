'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface Props {
  isDay: boolean
  /** Si se pasa, el mockup queda controlado por el padre (ej. selector de giro
   *  en el hero) — deja de manejar su propio índice y avisa cada rotación
   *  automática vía onScenarioChange en vez de avanzarlo internamente. */
  activeIndex?: number
  onScenarioChange?: (index: number) => void
}

interface Msg {
  from: 'customer' | 'bot'
  text: string
  time: string
}

interface Scenario {
  emoji: string
  business: string
  messages: Msg[]
}

// Un escenario por cada giro de la sección "Para tu negocio" — mismo orden
// y emoji que SEGMENTS en landing-page.tsx, para que el selector de giro
// pueda apuntar directo por índice.
export const SCENARIOS: Scenario[] = [
  {
    emoji: '💈',
    business: 'Barbería Central',
    messages: [
      { from: 'customer', text: 'Hola! ¿Tienen espacio mañana para un corte? ✂️', time: '10:02' },
      { from: 'bot', text: '¡Hola Luis! 👋 Claro que sí. Mañana tengo estos horarios con Carlos:\n\n1️⃣ 11:00\n2️⃣ 13:30\n3️⃣ 17:00\n\n¿Cuál te acomoda?', time: '10:02' },
      { from: 'customer', text: 'La 2', time: '10:03' },
      { from: 'bot', text: '✅ ¡Listo! Tu cita quedó agendada:\n\n💈 Corte de cabello · $180\n📅 Mañana a la 1:30 pm\n👤 Con Carlos\n\nTe mando un recordatorio un día antes 😉', time: '10:03' },
    ],
  },
  {
    emoji: '💆',
    business: 'Spa Serenity',
    messages: [
      { from: 'customer', text: 'Hola! ¿Tienen espacio para un masaje relajante esta semana? 💆‍♀️', time: '12:10' },
      { from: 'bot', text: '¡Hola Karla! ✨ Claro que sí. Tenemos disponible:\n\n1️⃣ Jueves 16:00\n2️⃣ Viernes 11:00\n\n¿Cuál te acomoda?', time: '12:10' },
      { from: 'customer', text: 'El viernes', time: '12:11' },
      { from: 'bot', text: '✅ ¡Reservado!\n\n💆 Masaje relajante · $650\n📅 Viernes 11:00 am\n💳 Anticipo de $200 para apartar tu lugar\n\nTe mandamos el link de pago 💜', time: '12:11' },
    ],
  },
  {
    emoji: '🏥',
    business: 'Clínica Sonríe',
    messages: [
      { from: 'customer', text: 'Buenas, necesito una limpieza dental 🪥', time: '16:20' },
      { from: 'bot', text: '¡Hola Ana! 😁 Con gusto. La Dra. Ramírez tiene disponible:\n\n1️⃣ Jueves 10:00\n2️⃣ Viernes 12:00\n\n¿Cuál prefieres?', time: '16:20' },
      { from: 'customer', text: 'El jueves está perfecto', time: '16:21' },
      { from: 'bot', text: '✅ ¡Agendada!\n\n🦷 Limpieza dental · $600\n📅 Jueves 10:00 am\n👩‍⚕️ Dra. Ramírez\n\nTe esperamos 💙', time: '16:21' },
    ],
  },
  {
    emoji: '🧠',
    business: 'Terapia Consciente',
    messages: [
      { from: 'customer', text: 'Hola, quisiera agendar mi sesión de terapia de esta semana', time: '18:02' },
      { from: 'bot', text: 'Hola Daniel 🙌 Con gusto. La Lic. Fuentes tiene disponible:\n\n1️⃣ Miércoles 18:00\n2️⃣ Jueves 17:00\n\n¿Cuál prefieres?', time: '18:02' },
      { from: 'customer', text: 'El miércoles, como siempre', time: '18:03' },
      { from: 'bot', text: '✅ ¡Confirmada!\n\n🧠 Sesión de terapia · $700\n📅 Miércoles 6:00 pm\n👩‍⚕️ Lic. Fuentes\n\nTe recordamos un día antes 💙', time: '18:03' },
    ],
  },
  {
    emoji: '🔬',
    business: 'Lab Diagnóstica MX',
    messages: [
      { from: 'customer', text: 'Buenas, ¿ya están mis resultados de laboratorio?', time: '09:40' },
      { from: 'bot', text: 'Hola Mariana 🔬 Déjame checar... ¡Sí! Tu estudio de Química Sanguínea ya está listo.\n\n¿Te lo envío por aquí o prefieres pasar a recogerlo?', time: '09:40' },
      { from: 'customer', text: 'Mándamelo por aquí porfa', time: '09:41' },
      { from: 'bot', text: '✅ ¡Enviado!\n\n📄 Resultados_Quimica_Sanguinea.pdf\n\nCualquier duda con tu médico, aquí seguimos 😊', time: '09:41' },
    ],
  },
  {
    emoji: '⛵',
    business: 'Charter Pacífico',
    messages: [
      { from: 'customer', text: 'Hola! Quiero rentar un yate para pesca este sábado, somos 4', time: '11:05' },
      { from: 'bot', text: '¡Hola Andrés! 🎣 Perfecto. El Capitán Mendoza tiene disponible:\n\n1️⃣ Sábado 7:00 am (6 hrs)\n2️⃣ Sábado 13:00 (4 hrs)\n\n¿Cuál te late?', time: '11:05' },
      { from: 'customer', text: 'La de la mañana', time: '11:06' },
      { from: 'bot', text: '✅ ¡Zarpando!\n\n⛵ Salida de pesca · $4,500\n📅 Sábado 7:00 am · 6 hrs\n👨‍✈️ Capitán Mendoza\n💳 Anticipo de $1,500 para asegurar tu salida', time: '11:06' },
    ],
  },
]

export function WhatsappMockup({ isDay, activeIndex, onScenarioChange }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [internalActive, setInternalActive] = useState(0)
  const controlled = activeIndex !== undefined
  const active = controlled ? activeIndex! : internalActive
  const scenario = SCENARIOS[active]

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const msgs = gsap.utils.toArray<HTMLElement>('[data-wa-msg]')
      const tl = gsap.timeline({
        delay: 0.6,
        onComplete: () => {
          // pasa a la siguiente conversación (rota en círculo) — si el padre
          // controla el índice, solo avisamos; si no, lo manejamos aquí mismo
          const next = (active + 1) % SCENARIOS.length
          if (controlled) onScenarioChange?.(next)
          else setInternalActive(next)
        },
      })
      msgs.forEach((m, i) => {
        tl.fromTo(m,
          { opacity: 0, y: 14, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
          i === 0 ? 0 : `+=${i % 2 === 1 ? 1.1 : 0.9}` // pausa como si escribieran
        )
      })
      // mantiene la conversación en pantalla y luego la desvanece antes de rotar
      tl.to(msgs, { opacity: 0, y: -10, duration: 0.5, stagger: 0.05, delay: 3 })
    }, root)
    return () => ctx.revert()
  }, [active])

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
        }}>{scenario.emoji}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{scenario.business}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>en línea</p>
        </div>
      </div>

      {/* Chat — altura fija (no minHeight): con minHeight el contenedor crecía
          según el escenario activo (515px/479px/497px medidos), empujando el
          div padre del hero en cada rotación. 520px cubre el más alto con margen. */}
      <div style={{
        background: wa.chatBg, padding: '16px 12px', height: 520, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end',
        transition: 'background .7s',
      }}>
        {scenario.messages.map((m, i) => (
          <div
            key={`${active}-${i}`}
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
