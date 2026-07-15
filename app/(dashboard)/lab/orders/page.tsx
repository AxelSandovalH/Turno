import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, ClipboardList } from 'lucide-react'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { LAB_STATUS_LABEL, LAB_STATUS_CLASS } from '@/lib/lab/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { LabOrderStatus } from '@/types/database'

const PAGE_SIZE = 30
const FILTERS: { key: string; label: string }[] = [
  { key: 'all',           label: 'Todas' },
  { key: 'registered',    label: 'Registradas' },
  { key: 'in_process',    label: 'En proceso' },
  { key: 'results_ready', label: 'Resultados' },
  { key: 'delivered',     label: 'Entregadas' },
  { key: 'cancelled',     label: 'Canceladas' },
]

export default async function LabOrdersPage({ searchParams }: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = 'all', page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const from = (page - 1) * PAGE_SIZE

  let query = db
    .from('lab_orders')
    .select('id, folio, status, total, created_at, customer:customers(name, phone)', { count: 'exact' })
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (status !== 'all') query = query.eq('status', status)

  const { data: orders, count } = await query
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Órdenes de laboratorio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{count ?? 0} en total</p>
        </div>
        <Link href="/lab/orders/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Nueva orden</Button>
        </Link>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {FILTERS.map(f => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/lab/orders' : `/lab/orders?status=${f.key}`}
            className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              status === f.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {(!orders || orders.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sin órdenes {status !== 'all' ? 'en este estado' : 'todavía'}</p>
          <p className="text-sm text-muted-foreground mb-5">Registra la primera orden desde recepción.</p>
          <Link href="/lab/orders/new"><Button size="sm">Nueva orden</Button></Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Folio</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Paciente</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Fecha</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Total</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => {
                const customer = o.customer as unknown as { name: string | null; phone: string } | null
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/lab/orders/${o.id}`} className="font-mono font-medium text-primary hover:underline">
                        {o.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{customer?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {format(new Date(o.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                      ${Number(o.total).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline" className={`text-xs ${LAB_STATUS_CLASS[o.status as LabOrderStatus]}`}>
                        {LAB_STATUS_LABEL[o.status as LabOrderStatus]}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/lab/orders?${status !== 'all' ? `status=${status}&` : ''}page=${page - 1}`}>
                <Button variant="outline" size="sm">← Anterior</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/lab/orders?${status !== 'all' ? `status=${status}&` : ''}page=${page + 1}`}>
                <Button variant="outline" size="sm">Siguiente →</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
