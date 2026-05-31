'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    whatsappNumber: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const slug = form.businessName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        name: form.businessName,
        slug,
        whatsappNumber: form.whatsappNumber,
        email: form.email,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? 'Error al configurar el negocio')
      setLoading(false)
      return
    }

    toast.success('¡Cuenta creada! Configuremos tu negocio...')
    router.push('/onboarding')
    router.refresh()
  }

  const field = (
    id: string,
    label: string,
    type: string,
    placeholder: string,
    hint?: string,
  ) => (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#ebebeb] mb-2">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={form[id as keyof typeof form]}
        onChange={handleChange}
        required
        className="w-full h-10 px-3 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#ebebeb] text-[14px] placeholder:text-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-colors"
      />
      {hint && <p className="text-[12px] text-[#3d3d3d] mt-1.5">{hint}</p>}
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#ebebeb] mb-1">Crea tu cuenta gratis</h1>
        <p className="text-[14px] text-[#6b6b6b]">14 días de prueba · Sin tarjeta de crédito</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {field('businessName', 'Nombre del negocio', 'text', 'Barbería El Estilo')}
        {field('whatsappNumber', 'WhatsApp del negocio', 'tel', '521XXXXXXXXXX', 'Formato internacional sin +. Ej: 521XXXXXXXXXX')}
        {field('email', 'Correo electrónico', 'email', 'tu@negocio.com')}

        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-[#ebebeb] mb-2">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full h-10 px-3 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#ebebeb] text-[14px] placeholder:text-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-medium text-[14px] transition-colors mt-2"
        >
          {loading ? 'Creando cuenta...' : 'Comenzar prueba gratis'}
        </button>
      </form>

      <p className="text-[13px] text-[#6b6b6b] text-center mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#ebebeb] hover:text-white transition-colors">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
