import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Microscope } from 'lucide-react'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { LAB_STATUS_LABEL, LAB_STATUS_CLASS } from '@/lib/lab/status'
import { Badge } from '@/components/ui/badge'
import type { LabOrderStatus } from '@/types/database'

export default async function WorklistPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: orders } = await db
    .from('lab_orders')
    .select(`
      id, folio, status, created_at,
      customer:customers(name),
      tests:lab_order_tests(test:lab_tests(name))
    `)
    .eq('organization_id', organization.id)
    .in('status', ['registered', 'in_process'])
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lista de trabajo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Órdenes pendientes de captura — las más antiguas primero
        </p>
      </div>

      {(!orders || orders.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Microscope className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sin órdenes pendientes</p>
          <p className="text-sm text-muted-foreground">Todo capturado. Las órdenes nuevas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => {
            const customer = o.customer as unknown as { name: string | null } | null
            const testNames = (o.tests as unknown as { test: { name: string } | null }[])
              .map(t => t.test?.name)
              .filter(Boolean)
              .join(' · ')
            return (
              <Link
                key={o.id}
                href={`/lab/orders/${o.id}/capture`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-semibold text-foreground">{o.folio}</span>
                    <Badge variant="outline" className={`text-xs ${LAB_STATUS_CLASS[o.status as LabOrderStatus]}`}>
                      {LAB_STATUS_LABEL[o.status as LabOrderStatus]}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mt-1">{customer?.name ?? 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{testNames}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    hace {formatDistanceToNow(new Date(o.created_at), { locale: es })}
                  </p>
                  <p className="text-xs text-primary font-medium mt-1">Capturar →</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
