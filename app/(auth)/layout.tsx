import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #A91079 0%, #2E0249 60%, transparent 100%)' }} />

      <div className="w-full max-w-sm relative">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3 justify-center mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #570A57, #A91079)' }}>
              <Image src="/logo.png" alt="Turno" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <span className="text-xl font-bold">Turno</span>
          </Link>
          <p className="text-sm text-muted-foreground">Recepcionista digital para tu negocio</p>
        </div>
        {children}
      </div>
    </div>
  )
}
