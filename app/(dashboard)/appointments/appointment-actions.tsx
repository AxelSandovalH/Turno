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
}

export function AppointmentActions({ appointmentId, status }: Props) {
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
