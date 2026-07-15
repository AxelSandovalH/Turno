'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LAB_STATUS_LABEL, LAB_STATUS_CLASS } from '@/lib/lab/status'
import type { LabOrderStatus } from '@/types/database'

interface AnalyteLink {
  sort_order: number
  analyte: { id: string; name: string; default_unit: string | null; ref_range: string | null } | null
}

interface OrderTest {
  id: string
  test: { id: string; name: string; lab_test_analytes: AnalyteLink[] } | null
  results: { analyte_id: string; value: string | null; unit: string | null; ref_range: string | null }[]
}

interface OrderData {
  id: string
  folio: string
  status: LabOrderStatus
  customer: { name: string | null; phone: string } | null
  tests: OrderTest[]
}

interface ResultRow {
  orderTestId: string
  analyteId: string
  name: string
  value: string
  unit: string
  refRange: string
}

export function CaptureClient({ order, staffId }: { order: OrderData; staffId: string | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  // Estado inicial: analitos del estudio (vía relacional) con resultado existente o defaults del catálogo
  const [rows, setRows] = useState<ResultRow[]>(() =>
    order.tests.flatMap(ot => {
      const links = (ot.test?.lab_test_analytes ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
      return links.flatMap(link => {
        if (!link.analyte) return []
        const existing = ot.results.find(r => r.analyte_id === link.analyte!.id)
        return [{
          orderTestId: ot.id,
          analyteId: link.analyte.id,
          name: link.analyte.name,
          value: existing?.value ?? '',
          unit: existing?.unit ?? link.analyte.default_unit ?? '',
          refRange: existing?.ref_range ?? link.analyte.ref_range ?? '',
        }]
      })
    })
  )

  function setRow(analyteId: string, orderTestId: string, patch: Partial<ResultRow>) {
    setRows(prev => prev.map(r =>
      r.analyteId === analyteId && r.orderTestId === orderTestId ? { ...r, ...patch } : r
    ))
  }

  const filled = rows.filter(r => r.value.trim() !== '').length

  async function save(markReady: boolean) {
    const toSave = rows.filter(r => r.value.trim() !== '')
    if (toSave.length === 0) return toast.error('Captura al menos un resultado')
    if (markReady && filled < rows.length) {
      return toast.error(`Faltan ${rows.length - filled} analitos por capturar`)
    }

    setSaving(true)
    const { error } = await supabase.from('lab_order_results').upsert(
      toSave.map(r => ({
        order_test_id: r.orderTestId,
        analyte_id: r.analyteId,
        value: r.value.trim(),
        unit: r.unit.trim() || null,
        ref_range: r.refRange.trim() || null,
        captured_by: staffId,
        captured_at: new Date().toISOString(),
      })),
      { onConflict: 'order_test_id,analyte_id' }
    )
    if (error) { setSaving(false); return toast.error(error.message) }

    // Primer guardado sobre una orden registrada → pasa a proceso; al terminar → resultados listos
    const newStatus = markReady ? 'results_ready' : order.status === 'registered' ? 'in_process' : null
    if (newStatus) {
      const { error: stErr } = await supabase.from('lab_orders').update({ status: newStatus }).eq('id', order.id)
      if (stErr) { setSaving(false); return toast.error(stErr.message) }
    }

    setSaving(false)
    toast.success(markReady ? 'Resultados completos — orden lista para entrega' : 'Avance guardado')
    if (markReady) router.push(`/lab/orders/${order.id}`)
    else router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/lab/worklist">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold font-mono text-foreground">{order.folio}</h1>
            <Badge variant="outline" className={LAB_STATUS_CLASS[order.status]}>
              {LAB_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {order.customer?.name ?? 'Sin nombre'} · Captura de resultados ({filled}/{rows.length})
          </p>
        </div>
      </div>

      {/* Un card por estudio, solo sus analitos */}
      {order.tests.map(ot => {
        const testRows = rows.filter(r => r.orderTestId === ot.id)
        if (testRows.length === 0) {
          return (
            <Card key={ot.id}>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{ot.test?.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Este estudio no tiene analitos asociados.{' '}
                  <Link href="/lab/tests" className="text-primary hover:underline">Configúralos en el catálogo</Link>.
                </p>
              </CardContent>
            </Card>
          )
        }
        return (
          <Card key={ot.id}>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{ot.test?.name}</CardTitle></CardHeader>
            <CardContent>
              {/* Encabezados */}
              <div className="hidden sm:grid grid-cols-[1fr_110px_110px_150px] gap-2 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                <span>Analito</span><span>Resultado</span><span>Unidad</span><span>Valores de referencia</span>
              </div>
              <div className="space-y-2">
                {testRows.map(r => (
                  <div key={r.analyteId} className="grid sm:grid-cols-[1fr_110px_110px_150px] gap-2 items-center">
                    <span className="text-sm font-medium text-foreground">{r.name}</span>
                    <Input
                      value={r.value}
                      placeholder="—"
                      className={r.value.trim() ? 'border-emerald-500/40' : ''}
                      onChange={e => setRow(r.analyteId, r.orderTestId, { value: e.target.value })}
                    />
                    <Input
                      value={r.unit}
                      placeholder="unidad"
                      onChange={e => setRow(r.analyteId, r.orderTestId, { unit: e.target.value })}
                    />
                    <Input
                      value={r.refRange}
                      placeholder="rango"
                      onChange={e => setRow(r.analyteId, r.orderTestId, { refRange: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => save(false)} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />Guardar avance
        </Button>
        <Button onClick={() => save(true)} disabled={saving || filled === 0}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {saving ? 'Guardando...' : 'Guardar y marcar resultados listos'}
        </Button>
      </div>
    </div>
  )
}
