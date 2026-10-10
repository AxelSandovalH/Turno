'use client'

import { BASES, ASSISTANT, money, type Segment } from '@/lib/plans'

interface Props {
  segment: Segment
  /** El complemento del asistente está agregado */
  assistant: boolean
  onToggle: () => void
}

// Plan armado con piezas: la base siempre va, el asistente de WhatsApp se agrega o se quita.
// Estilo oscuro de las pantallas de registro y pago.
export function PlanComposer({ segment, assistant, onToggle }: Props) {
  const base = BASES[segment]
  const addon = ASSISTANT.amountBySegment[segment]
  const total = base.amount + (assistant ? addon : 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Base: siempre incluida */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #7c3aed', background: '#7c3aed18' }}>
        <span style={{ width: 18, height: 18, borderRadius: 99, background: '#7c3aed', color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#e9e3ff' }}>{base.name}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: '#8b8b8b', marginTop: 2 }}>{base.description}</span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e9e3ff', whiteSpace: 'nowrap' }}>{money(base.amount)}<span style={{ fontSize: 10.5, fontWeight: 400, color: '#777' }}>/mes</span></span>
      </div>

      {/* Complemento: se agrega con un interruptor */}
      <button
        type="button"
        role="switch"
        aria-checked={assistant}
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          border: `1.5px solid ${assistant ? '#7c3aed' : '#252525'}`, background: assistant ? '#7c3aed18' : '#141414',
        }}
      >
        <span style={{ width: 34, height: 20, borderRadius: 99, background: assistant ? '#7c3aed' : '#333', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
          <span style={{ position: 'absolute', top: 2, left: assistant ? 16 : 2, width: 16, height: 16, borderRadius: 99, background: '#fff', transition: 'left .15s' }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: assistant ? '#e9e3ff' : '#ccc' }}>Agregar {ASSISTANT.name}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: '#8b8b8b', marginTop: 2 }}>{ASSISTANT.description}</span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: assistant ? '#e9e3ff' : '#aaa', whiteSpace: 'nowrap' }}>+{money(addon)}<span style={{ fontSize: 10.5, fontWeight: 400, color: '#777' }}>/mes</span></span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 4px 0' }}>
        <span style={{ fontSize: 12.5, color: '#888' }}>Total</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#ebebeb' }}>{money(total)} <span style={{ fontSize: 11, fontWeight: 400, color: '#777' }}>MXN/mes</span></span>
      </div>
    </div>
  )
}
