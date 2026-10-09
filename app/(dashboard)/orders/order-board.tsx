'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bike, Store, Banknote, Landmark, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { money, type OrderStatus } from '@/lib/orders'

export interface BoardOrder {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  fulfillment: 'delivery' | 'pickup'
  address: string | null
  notes: string | null
  total: number
  payment_method: 'cash' | 'transfer'
  status: OrderStatus
  source: 'web' | 'whatsapp'
  created_at: string
  items: { id: string; name: string; quantity: number; extras: { name: string }[]; notes: string | null }[]
}

const COLUMNS: { status: OrderStatus[]; title: string }[] = [
  { status: ['pending'], title: 'Nuevos' },
  { status: ['preparing'], title: 'Preparando' },
  { status: ['on_the_way'], title: 'En camino / Listo' },
  { status: ['delivered', 'cancelled'], title: 'Finalizados (24 h)' },
]

function nextAction(o: BoardOrder): { label: string; status: OrderStatus } | null {
  switch (o.status) {
    case 'pending': return { label: 'Aceptar y preparar', status: 'preparing' }
    case 'preparing': return { label: o.fulfillment === 'delivery' ? 'Salió a entrega' : 'Listo para recoger', status: 'on_the_way' }
    case 'on_the_way': return { label: 'Marcar entregado', status: 'delivered' }
    default: return null
  }
}

function OrderCard({ o }: { o: BoardOrder }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const action = nextAction(o)

  async function change(status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`¿Cancelar el pedido #${o.order_number}? Se le avisará al cliente.`)) return
    setBusy(true)
    const res = await fetch(`/api/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(false)
    if (!res.ok) { toast.error('No se pudo actualizar el pedido'); return }
    router.refresh()
  }

  const time = new Date(o.created_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })
  return (
    <Card className={o.status === 'cancelled' ? 'opacity-60' : ''}>
      <CardContent className="pt-4 pb-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">#{o.order_number} · {o.customer_name}</p>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <a href={`https://wa.me/${o.customer_phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Phone className="h-3 w-3" /> {o.customer_phone}
        </a>
        <ul className="text-sm space-y-0.5">
          {o.items.map(i => (
            <li key={i.id}>
              {i.quantity} × {i.name}
              {i.extras?.length > 0 && <span className="text-muted-foreground"> ({i.extras.map(e => e.name).join(', ')})</span>}
              {i.notes && <span className="block text-xs text-muted-foreground">Nota: {i.notes}</span>}
            </li>
          ))}
        </ul>
        {o.notes && <p className="text-xs rounded bg-muted px-2 py-1">Notas: {o.notes}</p>}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {o.fulfillment === 'delivery' ? <Bike className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <Store className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <span>{o.fulfillment === 'delivery' ? o.address : 'Pasa a recoger'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {o.payment_method === 'cash' ? <Banknote className="h-3.5 w-3.5" /> : <Landmark className="h-3.5 w-3.5" />}
            {o.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
          </span>
          <span className="font-semibold">{money(o.total)}</span>
        </div>
        {o.status === 'cancelled' && <p className="text-xs text-destructive">Cancelado</p>}
        {o.status === 'delivered' && <p className="text-xs text-emerald-500">Entregado</p>}
        {(action || o.status === 'pending' || o.status === 'preparing') && (
          <div className="flex gap-2 pt-1">
            {action && <Button size="sm" className="flex-1" disabled={busy} onClick={() => change(action.status)}>{action.label}</Button>}
            {o.status !== 'on_the_way' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => change('cancelled')}>Cancelar</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function OrderBoard({ orders }: { orders: BoardOrder[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
      {COLUMNS.map(col => {
        const list = orders.filter(o => col.status.includes(o.status))
        return (
          <div key={col.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </div>
            {list.length === 0
              ? <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">Sin pedidos</p>
              : list.map(o => <OrderCard key={o.id} o={o} />)}
          </div>
        )
      })}
    </div>
  )
}
