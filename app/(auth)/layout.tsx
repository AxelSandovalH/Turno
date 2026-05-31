import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0c0c0c', fontFamily: 'var(--font-geist-sans)' }}
    >
      <div className="w-full max-w-[400px]">
        <Link href="/" className="flex items-center gap-2 mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logotrans.png" alt="Turno" style={{ height: 40, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Link>
        {children}
      </div>
    </div>
  )
}
