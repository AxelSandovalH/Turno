import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { DocShell } from '@/components/lab/doc-shell'

interface Props { params: Promise<{ id: string }> }

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: order } = await db
    .from('lab_orders')
    .select(`
      folio, subtotal, discount, total, created_at,
      customer:customers(name, phone),
      tests:lab_order_tests(price_at_order, test:lab_tests(name))
    `)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .single()

  if (!order) notFound()

  const customer = order.customer as unknown as { name: string | null; phone: string } | null
  const tests = order.tests as unknown as { price_at_order: number; test: { name: string } | null }[]
  const money = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <DocShell
      org={organization}
      docTitle="Recibo"
      folio={order.folio}
      dateLabel={format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
      previewLabel={`Recibo ${order.folio}`}
    >
      {/* Paciente */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Paciente</p>
        <p className="text-base font-semibold">{customer?.name ?? 'Sin nombre'}</p>
        <p className="text-sm text-zinc-500">{customer?.phone}</p>
      </div>

      {/* Estudios */}
      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b border-zinc-300 text-[11px] uppercase tracking-wider text-zinc-400">
            <th className="text-left py-2 font-semibold">Estudio</th>
            <th className="text-right py-2 font-semibold">Importe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {tests.map((t, i) => (
            <tr key={i}>
              <td className="py-2.5">{t.test?.name ?? '—'}</td>
              <td className="py-2.5 text-right">{money(t.price_at_order)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span><span>{money(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Descuento</span><span>−{money(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t-2 border-zinc-900 pt-2">
            <span>Total</span><span>{money(order.total)}</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Gracias por su preferencia · {organization.name}
      </p>
    </DocShell>
  )
}
