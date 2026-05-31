import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0c0c0c', fontFamily: 'var(--font-geist-sans)' }}
    >
      <div className="w-full max-w-[400px]">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <Image src="/logo.png" alt="Turno" width={24} height={24} priority />
          <span style={{ fontSize: 15, fontWeight: 500, color: '#ebebeb', letterSpacing: '-0.01em' }}>
            Turno
          </span>
        </Link>
        {children}
      </div>
    </div>
  )
}
