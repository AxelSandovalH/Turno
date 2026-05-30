'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    // 2. Create organization via API route (uses service role)
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

    toast.success('¡Cuenta creada! Redirigiendo...')
    router.push('/appointments')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta gratis</CardTitle>
        <CardDescription>14 días de prueba. Sin tarjeta de crédito.</CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nombre del negocio</Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="Barbería El Estilo"
              value={form.businessName}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">Número de WhatsApp del negocio</Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              placeholder="521XXXXXXXXXX"
              value={form.whatsappNumber}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Formato internacional sin +. Ej: 521XXXXXXXXXX
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@negocio.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Comenzar prueba gratis'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
