import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 justify-center mb-2">
            <Image src="/logo.png" alt="Turno" width={32} height={32} priority />
            <span className="text-xl font-bold tracking-tight">Turno</span>
          </Link>
          <p className="text-sm text-muted-foreground">Recepcionista digital para tu negocio</p>
        </div>
        {children}
      </div>
    </div>
  )
}
