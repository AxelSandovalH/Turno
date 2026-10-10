import Link from 'next/link'
import { PressPattern } from '@/components/press-pattern'
import { TurnoLogo } from '@/components/ui/turno-logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0c0c0c', fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Left panel — decorative, desktop only */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden border-r border-[#1a1a1a] lg:sticky lg:top-0 lg:h-screen self-start">
        {/* La ilustración se desvanece hacia el negro en lugar de cortarse en seco */}
        <div
          className="absolute inset-0"
          style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 38%, transparent 58%)', maskImage: 'linear-gradient(to bottom, #000 38%, transparent 58%)' }}
        >
          <PressPattern />
        </div>
        <div className="relative z-10 p-10 mt-auto">
          <Link href="/" style={{ display: 'inline-block', marginBottom: 32, color: '#ffffff' }}>
            <TurnoLogo height={36} />
          </Link>
          <p className="text-[26px] font-bold text-[#ebebeb] leading-tight max-w-xs" style={{ letterSpacing: '-0.02em' }}>
            Tu recepcionista<br />trabaja 24/7.
          </p>
          <p className="text-[13px] text-[#777777] mt-3 max-w-xs leading-relaxed">
            Agenda citas y toma pedidos por WhatsApp, y manda recordatorios automáticos — sin que tú hagas nada.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 sm:py-16">
        <div className="lg:hidden mb-10" style={{ color: '#ffffff' }}>
          <Link href="/">
            <TurnoLogo height={32} />
          </Link>
        </div>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  )
}
