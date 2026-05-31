import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppointmentActions } from './appointment-actions'
import type { Appointment } from '@/types/database'

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  confirmed: { label: 'Confirmada', variant: 'default' },
  completed: { label: 'Completada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
  no_show: { label: 'No asistió', variant: 'outline' },
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data: appointments } = await service
    .from('appointments')
    .select(`
      *,
      customer:customers(name, phone),
      staff:staff(name),
      service:services(name, duration_minutes, price)
    `)
    .eq('organization_id', organizationId)
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .order('starts_at', { ascending: true })

  const list = (appointments ?? []) as Appointment[]
  const confirmed = list.filter(a => a.status === 'confirmed').length
  const completed = list.filter(a => a.status === 'completed').length
  const cancelled = list.filter(a => a.status === 'cancelled').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Citas de hoy</h1>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No hay citas programadas para hoy
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Barbero</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(appointment => {
                  const { label, variant } = statusLabel[appointment.status] ?? statusLabel.confirmed
                  return (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(appointment.starts_at), 'HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{appointment.customer?.name ?? 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{appointment.customer?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.service?.name}</TableCell>
                      <TableCell>{appointment.staff?.name}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>
                        <AppointmentActions appointmentId={appointment.id} status={appointment.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
