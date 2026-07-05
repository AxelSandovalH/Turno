'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CheckCircle, XCircle, UserX } from 'lucide-react'

interface Props {
  appointmentId: string
  status: string
  /** 'menu' (default) = dropdown de tres puntos · 'buttons' = quick buttons visibles */
  variant?: 'menu' | 'buttons'
}

export function AppointmentActions({ appointmentId, status, variant = 'menu' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function update(newStatus: string) {
    setLoading(true)
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    const labels: Record<string, string> = {
      completed: 'Marcada como completada',
      cancelled: 'Cita cancelada',
      no_show: 'Marcada como no asistió',
    }
    toast.success(labels[newStatus] ?? 'Actualizada')
    router.refresh()
  }

  if (status === 'completed' || status === 'cancelled') return null

  if (variant === 'buttons') {
    return (
      <div className="flex gap-2 w-full">
        {status === 'confirmed' && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => update('completed')}
            className="flex-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Completada
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => update('no_show')}
          className="flex-1 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
        >
          <UserX className="h-3.5 w-3.5 mr-1.5" />
          No asistió
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => update('cancelled')}
          className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={loading} />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === 'confirmed' && (
          <DropdownMenuItem onClick={() => update('completed')}>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Marcar completada
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => update('no_show')}>
          <UserX className="h-4 w-4 mr-2 text-yellow-600" />
          No asistió
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update('cancelled')} className="text-destructive">
          <XCircle className="h-4 w-4 mr-2" />
          Cancelar cita
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
