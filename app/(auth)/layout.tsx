import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-1">
            <Image src="/logo.png" alt="Turno" width={28} height={28} priority />
            <span className="text-[16px] font-semibold text-[#ebebeb]">Turno</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
