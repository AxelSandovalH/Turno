'use client'

import { CalendarDays, Users, MessageSquare, DollarSign } from 'lucide-react'

interface Props {
  isDay: boolean
}

interface ApptBlock {
  label: string
  time: string
  top: number
  height: number
  color: string
}

const APPTS: ApptBlock[] = [
  { label: 'Corte — Luis M.',   time: '10:00', top: 4,   height: 52, color: '#7c3aed' },
  { label: 'Barba — Diego R.',  time: '11:15', top: 68,  height: 36, color: '#10b981' },
  { label: 'Corte — Ana P.',    time: '12:00', top: 116, height: 52, color: '#3b82f6' },
]

function KPI({ label, value, color, isDay }: { label: string; value: string; color: string; isDay: boolean }) {
  return (
    <div
      className="flex-1 rounded-lg px-3 py-2.5"
      style={{ background: isDay ? '#f5f4f0' : '#161616', border: `1px solid ${isDay ? '#e0ddd8' : '#232323'}` }}
    >
      <p style={{ fontSize: 9.5, color: isDay ? '#8a8a8a' : '#6b6b6b', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
    </div>
  )
}

function SidebarIcon({ Icon, active, isDay }: { Icon: typeof CalendarDays; active: boolean; isDay: boolean }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{
        background: active ? '#7c3aed1f' : 'transparent',
        color: active ? '#7c3aed' : isDay ? '#a8a8a8' : '#565656',
      }}
    >
      <Icon size={15} strokeWidth={2} />
    </div>
  )
}

export function DashboardMockup({ isDay }: Props) {
  const d = isDay
    ? { window: '#ffffff', chrome: '#f0efe9', border: '#e0ddd8', text: '#111111', muted: '#8a8a8a', sidebarBg: '#faf9f6', urlBg: '#ffffff' }
    : { window: '#111111', chrome: '#0c0c0c', border: '#1f1f1f', text: '#ebebeb', muted: '#6b6b6b', sidebarBg: '#0c0c0c', urlBg: '#1a1a1a' }

  return (
    <div
      aria-hidden="true"
      style={{
        width: 440,
        maxWidth: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${d.border}`,
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.45)',
        background: d.window,
        transition: 'background .7s, border-color .7s',
      }}
    >
      {/* Browser chrome */}
      <div style={{ background: d.chrome, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${d.border}`, transition: 'background .7s, border-color .7s' }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#ff5f57' }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#febc2e' }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#28c840' }} />
        </div>
        <div style={{ flex: 1, height: 22, borderRadius: 6, background: d.urlBg, border: `1px solid ${d.border}`, display: 'flex', alignItems: 'center', padding: '0 10px', transition: 'background .7s, border-color .7s' }}>
          <span style={{ fontSize: 10, color: d.muted }}>app.quickturno.app/appointments</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', height: 288 }}>
        {/* Sidebar */}
        <div style={{ width: 48, background: d.sidebarBg, borderRight: `1px solid ${d.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 16, flexShrink: 0, transition: 'background .7s, border-color .7s' }}>
          <SidebarIcon Icon={CalendarDays} active isDay={isDay} />
          <SidebarIcon Icon={Users} active={false} isDay={isDay} />
          <SidebarIcon Icon={MessageSquare} active={false} isDay={isDay} />
          <SidebarIcon Icon={DollarSign} active={false} isDay={isDay} />
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: d.text, marginBottom: 10 }}>Hoy · Citas</p>

          {/* KPI row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <KPI label="Citas" value="12" color="#7c3aed" isDay={isDay} />
            <KPI label="Confirmadas" value="9" color="#10b981" isDay={isDay} />
            <KPI label="Ingresos" value="$3,200" color="#3b82f6" isDay={isDay} />
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', height: 172, borderLeft: `1px solid ${d.border}`, paddingLeft: 10, transition: 'border-color .7s' }}>
            {APPTS.map((a, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: a.top,
                  left: 10,
                  right: 0,
                  height: a.height,
                  borderRadius: 8,
                  background: `${a.color}1a`,
                  borderLeft: `3px solid ${a.color}`,
                  padding: '5px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 600, color: d.text, lineHeight: 1.2 }}>{a.label}</span>
                <span style={{ fontSize: 9, color: d.muted }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
