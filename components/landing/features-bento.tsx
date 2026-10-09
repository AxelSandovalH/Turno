'use client'

import { Users, Smartphone, Zap } from 'lucide-react'
import { ChatVisual, DepositVisual, ReminderVisual, TeamVisual, type Tokens } from './feature-visuals'

interface Props {
  t: Tokens
  isDay: boolean
}

/** Celda del bento. Los spans van en unidades de 6 (solo en lg) para que las
 *  filas cierren exactas: 4+2, 4+2, 3+3. Las celdas con visual no llevan ícono
 *  — el visual ya cumple esa función y el ícono genérico solo estorba. */
const SPAN: Record<number, string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
}

function Cell({ t, span, eyebrow, title, desc, Icon, children }: {
  t: Tokens
  span: 2 | 3 | 4
  eyebrow?: string
  title: string
  desc: string
  Icon?: typeof Users
  children?: React.ReactNode
}) {
  return (
    <div
      data-feature
      className={`rounded-2xl p-6 sm:p-7 flex flex-col transition-colors duration-500 ${SPAN[span]}`}
      style={{ opacity: 0, background: t.card, border: `1px solid ${t.border}` }}
    >
      {Icon && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
          style={{ background: `${t.accent}14`, color: t.accent }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      )}
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: t.accent }}>
          {eyebrow}
        </p>
      )}
      <h3 className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: t.text }}>{title}</h3>
      <p className="text-[13.5px] leading-relaxed" style={{ color: t.muted }}>{desc}</p>
      {/* flex-1 para que el visual absorba el alto sobrante de la fila en vez
          de dejar espacio muerto al fondo de la tarjeta */}
      {children && <div className="mt-5 flex-1 flex flex-col">{children}</div>}
    </div>
  )
}

export function FeaturesBento({ t, isDay }: Props) {
  return (
    <section id="features" style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
        <div data-section-head className="mb-14 sm:mb-20" style={{ opacity: 0 }}>
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Funciones</p>
          <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Todo lo que necesitas.</h2>
          <p className="text-[16px] max-w-lg" style={{ color: t.muted }}>Diseñado para cualquier negocio de citas. Sin configuraciones complicadas.</p>
        </div>

        <div data-features-grid className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
          {/* Fila 1 — 4 + 2 */}
          <Cell
            t={t}
            span={4}
            eyebrow="No más ghosting"
            title="Nunca pierdas una cita por no contestar"
            desc="Mientras trabajas, Turno responde al instante. Aunque te escriban a las 11 de la noche, la cita queda agendada."
          >
            <ChatVisual isDay={isDay} />
          </Cell>

          <Cell
            t={t}
            span={2}
            eyebrow="Anticipos"
            title="Cobra anticipo y asegura"
            desc="Turno manda el link de pago en la conversación y aparta el horario 20 minutos. Si no pagan, se libera solo."
          >
            <DepositVisual isDay={isDay} t={t} />
          </Cell>

          {/* Fila 2 — 4 + 2: una tarjeta con mockup, una sin (intercaladas) */}
          <Cell
            t={t}
            span={4}
            eyebrow="Confirmaciones"
            title="Confirma solo, un día antes"
            desc="Un día antes le recuerda a tu cliente su cita por WhatsApp. Si no puede ir, te avisa y el espacio se libera para otro."
          >
            <ReminderVisual isDay={isDay} t={t} />
          </Cell>

          <Cell
            t={t}
            span={2}
            Icon={Smartphone}
            title="Tus clientes no instalan nada"
            desc="Usan el WhatsApp que ya tienen en su teléfono. Escriben como siempre y Turno se encarga del resto."
          />

          {/* Fila 3 — 2 + 4: la otra sin mockup, y el equipo cierra el bento */}
          <Cell
            t={t}
            span={2}
            Icon={Zap}
            title="Listo el mismo día"
            desc="Creas tu cuenta, pones tus servicios y horarios, y tu WhatsApp ya contesta solo. Sin técnicos ni instalaciones."
          />

          <Cell
            t={t}
            span={4}
            eyebrow="Agendas"
            title="Todo tu equipo, cada quien su agenda"
            desc="Cada profesional con su propio horario, servicios y precios. Turno sabe con quién agendar a cada cliente."
          >
            <TeamVisual t={t} />
          </Cell>
        </div>
      </div>
    </section>
  )
}
