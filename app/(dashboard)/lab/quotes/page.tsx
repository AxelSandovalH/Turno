import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, FileText } from 'lucide-react'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { Button } from '@/components/ui/button'

export default async function LabQuotesPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: quotes } = await db
    .from('lab_quotes')
    .select('id, folio, customer_name, total, valid_until, created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Presupuestos sin registrar venta</p>
        </div>
        <Link href="/lab/quotes/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Nueva cotización</Button>
        </Link>
      </div>

      {(!quotes || quotes.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sin cotizaciones todavía</p>
          <p className="text-sm text-muted-foreground mb-5">Genera un presupuesto imprimible sin registrar la venta.</p>
          <Link href="/lab/quotes/new"><Button size="sm">Nueva cotización</Button></Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Folio</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Cliente</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Fecha</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Vigencia</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/lab/quotes/${q.id}`} className="font-mono font-medium text-primary hover:underline">
                      {q.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{q.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {format(new Date(q.created_at), 'd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {q.valid_until ? format(new Date(`${q.valid_until}T12:00:00`), 'd MMM yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">${Number(q.total).toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
