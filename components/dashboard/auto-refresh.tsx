'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-consulta los datos del server component contenedor cada `intervalMs`.
 * router.refresh() no recarga la página ni pierde estado de la UI.
 */
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      // No refrescar en segundo plano — ahorra queries cuando la pestaña está oculta
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, router])

  return null
}
