'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function PaymentSuccessToast() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (params?.get('payment') === 'success') {
      toast.success('¡Suscripción activada! Bienvenido a Turno AI 🎉')
      // Limpiar el query param sin recargar
      router.replace('/appointments')
    }
  }, [params, router])

  return null
}
