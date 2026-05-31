'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/appointments')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#ebebeb] mb-1">Iniciar sesión</h1>
        <p className="text-[14px] text-[#6b6b6b]">Ingresa a tu panel de control</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-[#ebebeb] mb-2">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            placeholder="tu@negocio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full h-10 px-3 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#ebebeb] text-[14px] placeholder:text-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-[#ebebeb] mb-2">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#ebebeb] text-[14px] placeholder:text-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-medium text-[14px] transition-colors mt-2"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-[13px] text-[#6b6b6b] text-center mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-[#ebebeb] hover:text-white transition-colors">
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
