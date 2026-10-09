'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag, X, Check } from 'lucide-react'
import { COUNTRIES, DEFAULT_COUNTRY, buildPhone } from '@/lib/booking-format'

interface Extra { name: string; price: number }
interface Item { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; extras: Extra[]; is_available: boolean }
interface Category { id: string; name: string }
interface Org {
  slug: string; name: string; address: string | null; logo_url: string | null; accent: string
  deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: number; minAmount: number
  accepting: boolean
}
type Returned = { paid: true; number: number } | { paid: false } | null
interface CartLine { key: string; item: Item; quantity: number; extras: string[]; notes: string }

const money = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
const lineUnit = (l: CartLine) => l.item.price + l.extras.reduce((s, nm) => s + (l.item.extras.find(e => e.name === nm)?.price ?? 0), 0)

export function OrderForm({ org, categories, items, returned = null }: { org: Org; categories: Category[]; items: Item[]; returned?: Returned }) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [picking, setPicking] = useState<Item | null>(null)
  const [pickExtras, setPickExtras] = useState<string[]>([])
  const [pickNotes, setPickNotes] = useState('')
  const [pickQty, setPickQty] = useState(1)
  const [view, setView] = useState<'menu' | 'cart' | 'done'>(returned?.paid ? 'done' : 'menu')

  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>(org.deliveryEnabled ? 'delivery' : 'pickup')
  const [name, setName] = useState('')
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [national, setNational] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done] = useState<{ number: number } | null>(returned?.paid ? { number: returned.number } : null)

  const accent = org.accent
  const subtotal = cart.reduce((s, l) => s + lineUnit(l) * l.quantity, 0)
  const fee = fulfillment === 'delivery' ? org.deliveryFee : 0
  const total = subtotal + fee
  const count = cart.reduce((s, l) => s + l.quantity, 0)
  const belowMin = subtotal < org.minAmount
  const fullPhone = buildPhone(country, national)

  const sections = useMemo(() => {
    const known = new Set(categories.map(c => c.id))
    const groups = categories.map(c => ({ id: c.id, name: c.name, items: items.filter(i => i.category_id === c.id) }))
    const loose = items.filter(i => !i.category_id || !known.has(i.category_id))
    if (loose.length) groups.push({ id: 'otros', name: categories.length ? 'Otros' : 'Menú', items: loose })
    return groups.filter(g => g.items.length)
  }, [categories, items])

  function openItem(it: Item) {
    if (!it.is_available || !org.accepting) return
    setPicking(it); setPickExtras([]); setPickNotes(''); setPickQty(1)
  }

  function addToCart() {
    if (!picking) return
    const key = `${picking.id}|${[...pickExtras].sort().join(',')}|${pickNotes.trim()}`
    setCart(prev => {
      const found = prev.find(l => l.key === key)
      if (found) return prev.map(l => l.key === key ? { ...l, quantity: l.quantity + pickQty } : l)
      return [...prev, { key, item: picking, quantity: pickQty, extras: pickExtras, notes: pickNotes.trim() }]
    })
    setPicking(null)
  }

  const setQty = (key: string, delta: number) =>
    setCart(prev => prev.map(l => l.key === key ? { ...l, quantity: l.quantity + delta } : l).filter(l => l.quantity > 0))

  const pickUnit = picking ? picking.price + pickExtras.reduce((s, nm) => s + (picking.extras.find(e => e.name === nm)?.price ?? 0), 0) : 0

  async function submit() {
    setError('')
    if (!name.trim()) return setError('Escribe tu nombre')
    if (!fullPhone) return setError('Revisa tu número de WhatsApp')
    if (fulfillment === 'delivery' && address.trim().length < 6) return setError('Escribe tu dirección de entrega completa')
    if (belowMin) return setError(`El pedido mínimo es de ${money(org.minAmount)}`)
    setSending(true)
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: org.slug,
          customer_name: name,
          customer_phone: fullPhone,
          fulfillment,
          address,
          notes,
          items: cart.map(l => ({ menu_item_id: l.item.id, quantity: l.quantity, extras: l.extras, notes: l.notes })),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) { setError(data?.error ?? 'No se pudo enviar el pedido. Intenta de nuevo.'); return }
      if (!data.checkoutUrl) { setError('No se pudo iniciar el pago. Intenta de nuevo.'); return }
      window.location.href = data.checkoutUrl // pago seguro en Stripe
    } catch {
      setError('No se pudo conectar. Revisa tu internet e intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const input = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600'

  const header = (
    <div className="border-b border-zinc-800">
      <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
        {org.logo_url ? (
          <div className="h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.logo_url} alt={org.name} className="h-full w-auto max-w-[200px] object-contain rounded-xl" />
          </div>
        ) : (
          <div className="h-14 w-14 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: `${accent}22`, color: accent }}>
            {org.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{org.name}</p>
          {org.address && <p className="text-xs text-zinc-500">{org.address}</p>}
        </div>
      </div>
    </div>
  )

  if (view === 'done' && done) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        {header}
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-5" style={{ background: accent }}>
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">¡Pedido recibido!</h1>
          <p className="text-zinc-400 mt-2">Pedido #{done.number} · pago recibido</p>
          <p className="text-sm text-zinc-500 mt-4">Te enviamos la confirmación por WhatsApp y te avisaremos cuando avance tu pedido.</p>
          <button onClick={() => setView('menu')} className="mt-8 text-sm text-zinc-400 underline">Hacer otro pedido</button>
        </div>
      </div>
    )
  }

  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pb-32">
        {header}
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <button onClick={() => setView('menu')} className="text-sm text-zinc-400">← Seguir pidiendo</button>
          <h1 className="text-xl font-semibold">Tu pedido</h1>

          <div className="space-y-3">
            {cart.map(l => (
              <div key={l.key} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{l.item.name}</p>
                  {l.extras.length > 0 && <p className="text-xs text-zinc-500">{l.extras.join(', ')}</p>}
                  {l.notes && <p className="text-xs text-zinc-500">Nota: {l.notes}</p>}
                  <p className="text-sm text-zinc-300 mt-1">{money(lineUnit(l) * l.quantity)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button aria-label="Quitar uno" onClick={() => setQty(l.key, -1)} className="h-8 w-8 rounded-full border border-zinc-700 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                  <span className="w-5 text-center">{l.quantity}</span>
                  <button aria-label="Agregar uno" onClick={() => setQty(l.key, 1)} className="h-8 w-8 rounded-full border border-zinc-700 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <p className="text-sm text-zinc-500">Tu pedido está vacío.</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-zinc-400">¿Cómo lo quieres?</p>
            <div className="grid grid-cols-2 gap-2">
              {([['delivery', 'A domicilio', org.deliveryEnabled], ['pickup', 'Paso a recoger', org.pickupEnabled]] as const).map(([k, label, on]) => (
                <button key={k} disabled={!on} onClick={() => setFulfillment(k)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium disabled:opacity-30 ${fulfillment === k ? 'text-white' : 'border-zinc-800 text-zinc-400'}`}
                  style={fulfillment === k ? { borderColor: accent, background: `${accent}22` } : undefined}>
                  {label}
                </button>
              ))}
            </div>
            {fulfillment === 'delivery' && (
              <textarea className={input} rows={2} placeholder="Dirección de entrega (calle, número, colonia, referencias)" value={address} onChange={e => setAddress(e.target.value)} />
            )}
          </div>

          <div className="space-y-3">
            <input className={input} placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-2">
              <select className={`${input} !w-28 shrink-0`} value={country} onChange={e => setCountry(e.target.value)} aria-label="Lada">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>+{c.code}</option>)}
              </select>
              <input className={input} inputMode="tel" placeholder="Tu WhatsApp" value={national} onChange={e => setNational(e.target.value)} />
            </div>
            <textarea className={input} rows={2} placeholder="Notas para el pedido (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <p className="text-xs text-zinc-500">El pago se hace en línea con tarjeta, de forma segura con Stripe. Tu pedido se envía al negocio al confirmarse el pago.</p>

          <div className="rounded-xl border border-zinc-800 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {fulfillment === 'delivery' && <div className="flex justify-between text-zinc-400"><span>Envío</span><span>{fee > 0 ? money(fee) : 'Gratis'}</span></div>}
            <div className="flex justify-between font-semibold text-base pt-1"><span>Total</span><span>{money(total)}</span></div>
          </div>
          {belowMin && cart.length > 0 && <p className="text-sm text-amber-400">El pedido mínimo es de {money(org.minAmount)}. Te faltan {money(org.minAmount - subtotal)}.</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur p-4">
          <button onClick={submit} disabled={sending || cart.length === 0 || belowMin}
            className="max-w-lg mx-auto block w-full rounded-xl py-4 font-semibold text-white disabled:opacity-40" style={{ background: accent }}>
            {sending ? 'Un momento…' : `Pagar con tarjeta · ${money(total)}`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28">
      {header}
      <div className="max-w-lg mx-auto px-4 py-6">
        {returned && !returned.paid && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            El pago no se completó, así que tu pedido no se envió. Puedes intentarlo de nuevo.
          </div>
        )}
        {!org.accepting && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Por ahora no estamos recibiendo pedidos. Puedes ver el menú y volver más tarde.
          </div>
        )}
        {sections.length === 0 && <p className="text-sm text-zinc-500">El menú aún no está disponible.</p>}
        {sections.map(sec => (
          <section key={sec.id} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">{sec.name}</h2>
            <div className="space-y-3">
              {sec.items.map(it => (
                <button key={it.id} onClick={() => openItem(it)} disabled={!it.is_available || !org.accepting}
                  className="w-full flex items-stretch gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-left disabled:opacity-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{it.name}</p>
                    {it.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{it.description}</p>}
                    <p className="text-sm mt-2" style={{ color: accent }}>{it.is_available ? money(it.price) : 'Agotado'}</p>
                  </div>
                  {it.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt={it.name} className="h-24 w-24 rounded-xl object-cover shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
          <button onClick={() => setView('cart')} className="max-w-lg mx-auto flex w-full items-center justify-between rounded-xl px-5 py-4 font-semibold text-white" style={{ background: accent }}>
            <span className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Ver pedido ({count})</span>
            <span>{money(subtotal)}</span>
          </button>
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={() => setPicking(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{picking.name}</p>
                {picking.description && <p className="text-sm text-zinc-500 mt-1">{picking.description}</p>}
              </div>
              <button aria-label="Cerrar" onClick={() => setPicking(null)}><X className="h-5 w-5 text-zinc-500" /></button>
            </div>

            {picking.extras.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-zinc-400">Extras</p>
                {picking.extras.map(e => {
                  const on = pickExtras.includes(e.name)
                  return (
                    <button key={e.name} onClick={() => setPickExtras(p => on ? p.filter(x => x !== e.name) : [...p, e.name])}
                      className="w-full flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3 text-sm"
                      style={on ? { borderColor: accent, background: `${accent}22` } : undefined}>
                      <span>{e.name}</span><span className="text-zinc-400">+{money(e.price)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <input className={`${input} mt-4`} placeholder="Nota (ej. sin cebolla)" value={pickNotes} onChange={e => setPickNotes(e.target.value)} maxLength={120} />

            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button aria-label="Menos" onClick={() => setPickQty(q => Math.max(1, q - 1))} className="h-10 w-10 rounded-full border border-zinc-700 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center text-lg">{pickQty}</span>
                <button aria-label="Más" onClick={() => setPickQty(q => Math.min(50, q + 1))} className="h-10 w-10 rounded-full border border-zinc-700 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
              <button onClick={addToCart} className="flex-1 rounded-xl py-3.5 font-semibold text-white" style={{ background: accent }}>
                Agregar · {money(pickUnit * pickQty)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
