'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Check, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { TypedText } from '@/components/landing/demo/motion'

interface Msg { role: 'user' | 'assistant'; content: string; changes?: string[]; fresh?: boolean }

const KICKOFF = 'Hola, ayúdame a dejar listo mi negocio.'
const STORE = 'qt-setup-chat'

export function SetupChat({ orgName, slug, usesAgenda, drafts }: { orgName: string; slug: string; usesAgenda: boolean; drafts: number }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const send = useCallback(async (text: string, hidden = false, base?: Msg[]) => {
    const history: Msg[] = [...(base ?? []), { role: 'user', content: text }]
    setMessages(hidden ? (base ?? []) : history)
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/setup-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No pude responder.')
      setMessages([...(hidden ? [] : history), { role: 'assistant', content: data.reply, changes: data.changes, fresh: true }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude responder.')
    } finally {
      setBusy(false)
    }
  }, [])

  // Al entrar: recupera la conversación de esta sesión o arranca con el repaso del negocio
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null') as Msg[] | null
        if (saved?.length) { setMessages(saved.map(m => ({ ...m, fresh: false }))); return }
      } catch { /* sin almacenamiento */ }
      send(KICKOFF, true)
    }, 0)
    return () => clearTimeout(id)
  }, [send])

  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.map(m => ({ ...m, fresh: false })))) } catch { /* nada */ } }, [messages])
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])

  const submit = (text = input) => { const t = text.trim(); if (!t || busy) return; setInput(''); send(t, false, messages.map(m => ({ ...m, fresh: false }))) }

  const suggestions = drafts > 0
    ? ['Los precios de mis servicios están bien, publícalos', 'Quiero cambiar algunos precios', 'Agrega un servicio nuevo']
    : usesAgenda ? ['Quiero agregar mis servicios', 'Configura mi horario', 'Agrega a mi equipo'] : ['Actualiza la dirección de mi negocio', 'Escribe el mensaje de bienvenida de mi bot']

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="flex h-[620px] flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary"><Sparkles size={14} /></span>
          <div><p className="text-sm font-semibold leading-tight">Asistente de QuickTurno</p><p className="text-[11px] text-muted-foreground">Configurando {orgName}</p></div>
        </div>

        <div ref={box} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className="max-w-[88%] space-y-2">
                <div className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.role === 'assistant' && m.fresh ? <TypedText text={m.content} speed={10} caret /> : m.content}
                </div>
                {m.changes && m.changes.length > 0 && (
                  <ul className="space-y-1">
                    {m.changes.map((c, k) => <li key={k} className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><Check size={13} className="mt-0.5 shrink-0" />{c}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Pensando…</div></div>}
          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        </div>

        <div className="border-t border-border p-3">
          {!busy && messages.length > 0 && messages.length < 4 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map(s => <button key={s} type="button" onClick={() => submit(s)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">{s}</button>)}
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); submit() }} className="flex items-end gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={1} maxLength={1000} disabled={busy}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="Escribe aquí… por ejemplo: el corte cuesta $200 y dura 30 minutos"
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"><ArrowUp size={18} /></button>
          </form>
        </div>
      </div>

      <aside className="space-y-3 text-sm">
        {usesAgenda && (
          <a href={`/book/${slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted">
            <span><span className="block font-medium">Tu página de reservas</span><span className="text-xs text-muted-foreground">/book/{slug}</span></span><ExternalLink size={16} className="text-muted-foreground" />
          </a>
        )}
        {[{ href: '/services', label: 'Servicios y fotos' }, { href: '/schedule', label: 'Horarios' }, { href: '/settings', label: 'Logo y configuración' }].map(l => (
          <Link key={l.href} href={l.href} className="block rounded-xl border border-border p-3.5 font-medium transition-colors hover:bg-muted">{l.label}</Link>
        ))}
        <p className="px-1 text-xs text-muted-foreground">La IA aplica los cambios por ti. El logo y las fotos de los servicios se suben desde esas pantallas.</p>
      </aside>
    </div>
  )
}
