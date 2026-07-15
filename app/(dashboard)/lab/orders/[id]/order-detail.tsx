'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, User, Phone, ArrowRight, Ban, FlaskConical, Receipt, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LAB_STATUS_LABEL, LAB_STATUS_CLASS, LAB_STATUS_NEXT } from '@/lib/lab/status'
import type { LabOrderStatus } from '@/types/database'

interface ResultRow {
  analyte_id: string
  value: string | null
  unit: string | null
  ref_range: string | null
  analyte: { name: string } | null
}

interface OrderTestRow {
  id: string
  test_id: string
  price_at_order: number
  test: { name: string; description: string | null } | null
  results: ResultRow[]
}

interface OrderData {
  id: string
  folio: string
  status: LabOrderStatus
  subtotal: number
  discount: number
  total: number
  notes: string | null
  created_at: string
  customer: { id: string; name: string | null; phone: string } | null
  tests: OrderTestRow[]
}

const NEXT_LABEL: Partial<Record<LabOrderStatus, string>> = {
  in_process:    'Pasar a proceso',
  results_ready: 'Marcar resultados capturados',
  delivered:     'Marcar entregada',
}

export function OrderDetail({ order }: { order: OrderData }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const transitions = LAB_STATUS_NEXT[order.status].filter(s => s !== 'cancelled')
  const canCancel = LAB_STATUS_NEXT[order.status].includes('cancelled')

  async function setStatus(status: LabOrderStatus) {
    setLoading(true)
    const patch: Record<string, unknown> = { status }
    if (status === 'delivered') patch.delivered_at = new Date().toISOString()
    if (status === 'cancelled') patch.cancelled_at = new Date().toISOString()

    const { error } = await supabase.from('lab_orders').update(patch).eq('id', order.id)
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(`Orden ${LAB_STATUS_LABEL[status].toLowerCase()}`)
    setConfirmCancel(false)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/lab/orders">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold font-mono text-foreground">{order.folio}</h1>
            <Badge variant="outline" className={`${LAB_STATUS_CLASS[order.status]}`}>
              {LAB_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registrada el {format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
      </div>

      {/* Paciente */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Paciente</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{order.customer?.name ?? 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />{order.customer?.phone}
                </p>
              </div>
            </div>
            {order.customer && (
              <Link href={`/patients/${order.customer.id}`} className="text-xs text-primary hover:underline">
                Ver expediente →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estudios */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Estudios ({order.tests.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {order.tests.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.test?.name ?? '—'}</p>
                  {t.test?.description && <p className="text-xs text-muted-foreground">{t.test.description}</p>}
                </div>
                <span className="text-sm font-medium">${Number(t.price_at_order).toLocaleString('es-MX')}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>${Number(order.subtotal).toLocaleString('es-MX')}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span><span>−${Number(order.discount).toLocaleString('es-MX')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground pt-1">
              <span>Total</span><span>${Number(order.total).toLocaleString('es-MX')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{order.notes}</div>
      )}

      {/* Resultados capturados */}
      {order.tests.some(t => t.results.length > 0) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Resultados</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {order.tests.filter(t => t.results.length > 0).map(t => (
              <div key={t.id}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.test?.name}</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
                        <th className="text-left px-3 py-1.5 font-medium">Analito</th>
                        <th className="text-right px-3 py-1.5 font-medium">Resultado</th>
                        <th className="text-left px-3 py-1.5 font-medium">Unidad</th>
                        <th className="text-left px-3 py-1.5 font-medium hidden sm:table-cell">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {t.results.map(r => (
                        <tr key={r.analyte_id}>
                          <td className="px-3 py-2">{r.analyte?.name ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold">{r.value ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.unit ?? ''}</td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{r.ref_range ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documentos */}
      {order.status !== 'cancelled' && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/lab/orders/${order.id}/receipt`}>
            <Button variant="outline" size="sm"><Receipt className="h-4 w-4 mr-1.5" />Recibo</Button>
          </Link>
          {order.tests.some(t => t.results.length > 0) && (
            <Link href={`/lab/orders/${order.id}/report`}>
              <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />Reporte de resultados</Button>
            </Link>
          )}
        </div>
      )}

      {/* Acciones de estado */}
      {(transitions.length > 0 || canCancel) && (
        <div className="flex gap-2 flex-wrap">
          {(order.status === 'registered' || order.status === 'in_process') && (
            <Link href={`/lab/orders/${order.id}/capture`}>
              <Button variant="outline"><FlaskConical className="h-4 w-4 mr-1.5" />Capturar resultados</Button>
            </Link>
          )}
          {transitions.map(s => (
            <Button key={s} onClick={() => setStatus(s)} disabled={loading}>
              {NEXT_LABEL[s]}<ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ))}
          {canCancel && (
            <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmCancel(true)} disabled={loading}>
              <Ban className="h-4 w-4 mr-1.5" />Cancelar orden
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la orden {order.folio}?</AlertDialogTitle>
            <AlertDialogDescription>La orden quedará cancelada y no podrá capturarse. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStatus('cancelled')}>Cancelar orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
