import Link from 'next/link'
import { PressPattern } from '@/components/press-pattern'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0c0c0c', fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Left panel — decorative, desktop only */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden border-r border-[#1a1a1a]">
        <div className="absolute inset-0">
          <PressPattern />
        </div>
        <div className="relative z-10 p-10 mt-auto">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotrans.png" alt="Turno" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)', marginBottom: 32 }} />
          </Link>
          <p className="text-[26px] font-bold text-[#ebebeb] leading-tight max-w-xs" style={{ letterSpacing: '-0.02em' }}>
            Tu recepcionista<br />trabaja 24/7.
          </p>
          <p className="text-[13px] text-[#555555] mt-3 max-w-xs leading-relaxed">
            El bot agenda citas por WhatsApp y manda recordatorios automáticos — sin que tú hagas nada.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
        <div className="lg:hidden mb-10">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotrans.png" alt="Turno" style={{ height: 32, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  )
}
