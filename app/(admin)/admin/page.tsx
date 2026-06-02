import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Trial',
  active: 'Activo',
  past_due: 'Vencido',
  canceled: 'Cancelado',
  suspended: 'Suspendido',
}

const STATUS_COLOR: Record<string, string> = {
  trialing: 'bg-blue-500/10 text-blue-400',
  active: 'bg-emerald-500/10 text-emerald-400',
  past_due: 'bg-yellow-500/10 text-yellow-400',
  canceled: 'bg-zinc-500/10 text-zinc-400',
  suspended: 'bg-red-500/10 text-red-400',
}

async function getStats() {
  const db = createServiceClient()

  const [{ data: orgs }, { count: totalAppointments }, { count: totalCustomers }] = await Promise.all([
    db.from('organizations').select('id, name, slug, whatsapp_number, email, subscription_status, trial_ends_at, created_at').order('created_at', { ascending: false }),
    db.from('appointments').select('id', { count: 'exact', head: true }),
    db.from('customers').select('id', { count: 'exact', head: true }),
  ])

  return { orgs: orgs ?? [], totalAppointments: totalAppointments ?? 0, totalCustomers: totalCustomers ?? 0 }
}

export default async function AdminPage() {
  const { orgs, totalAppointments, totalCustomers } = await getStats()

  const byStatus = orgs.reduce<Record<string, number>>((acc, o) => {
    acc[o.subscription_status] = (acc[o.subscription_status] ?? 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Organizaciones', value: orgs.length },
    { label: 'En trial', value: byStatus['trialing'] ?? 0 },
    { label: 'Activas', value: byStatus['active'] ?? 0 },
    { label: 'Citas totales', value: totalAppointments },
    { label: 'Clientes totales', value: totalCustomers },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general de la plataforma Turno</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Orgs table */}
      <div>
        <h2 className="text-base font-medium mb-3">Organizaciones</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Negocio</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Trial vence</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{org.whatsapp_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[org.subscription_status] ?? ''}`}>
                      {STATUS_LABEL[org.subscription_status] ?? org.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {org.trial_ends_at ? format(new Date(org.trial_ends_at), 'd MMM yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(org.created_at), 'd MMM yyyy', { locale: es })}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No hay organizaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
