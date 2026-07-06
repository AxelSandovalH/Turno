'use client'

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageCircle, Phone, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Conversation, Message, Customer } from '@/types/database'

type ConvWithCustomer = Conversation & { customer: Pick<Customer, 'id' | 'name' | 'phone'> | null }

interface Props {
  conversations: ConvWithCustomer[]
  selectedId: string | null
  activeConversation: ConvWithCustomer | null
  messages: Message[]
  isMedical: boolean
  page: number
  totalPages: number
}

function initials(name: string | null | undefined, phone: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return phone.slice(-2)
}

function displayName(conv: ConvWithCustomer): string {
  return conv.customer?.name ?? conv.whatsapp_phone
}

// ── Conversation list item ────────────────────────────────────────────────────
function ConvItem({ conv, selected, page }: { conv: ConvWithCustomer; selected: boolean; page: number }) {
  const name = displayName(conv)
  const time = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { locale: es, addSuffix: false })
    : null

  return (
    <Link
      href={`/conversations?id=${conv.id}${page > 1 ? `&page=${page}` : ''}`}
      className={`flex items-start gap-3 px-4 py-3 border-b border-border transition-colors hover:bg-muted/30 ${selected ? 'bg-muted/50' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
        {initials(conv.customer?.name, conv.whatsapp_phone)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {time && <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.whatsapp_phone}</p>
      </div>
    </Link>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
        isUser
          ? 'bg-muted text-foreground rounded-tl-sm'
          : 'bg-violet-600 text-white rounded-tr-sm'
      }`}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-muted-foreground' : 'text-violet-200'}`}>
          {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  )
}

// ── Date separator ────────────────────────────────────────────────────────────
function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] text-muted-foreground shrink-0">
        {format(new Date(date), "d 'de' MMMM", { locale: es })}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Main layout ───────────────────────────────────────────────────────────────
export function ConversationsLayout({ conversations, selectedId, activeConversation, messages, isMedical, page, totalPages }: Props) {
  const label = isMedical ? 'Paciente' : 'Cliente'

  // Group messages by date for separators
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== day) grouped.push({ date: day, msgs: [msg] })
    else last.msgs.push(msg)
  }

  return (
    <div className="flex h-[calc(100vh-73px)] -m-6 overflow-hidden">

      {/* ── Sidebar: conversation list ─────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="px-4 py-3 border-b border-border">
          <h1 className="text-sm font-semibold text-foreground">Conversaciones</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} chats de WhatsApp</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aún no hay conversaciones. Cuando alguien le escriba al bot aparecerán aquí.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConvItem key={conv.id} conv={conv} selected={conv.id === selectedId} page={page} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border shrink-0">
            <Link
              href={`/conversations?page=${page - 1}${selectedId ? `&id=${selectedId}` : ''}`}
              className={`text-xs ${page <= 1 ? 'pointer-events-none opacity-30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ← Anterior
            </Link>
            <span className="text-[10px] text-muted-foreground">{page} / {totalPages}</span>
            <Link
              href={`/conversations?page=${page + 1}${selectedId ? `&id=${selectedId}` : ''}`}
              className={`text-xs ${page >= totalPages ? 'pointer-events-none opacity-30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Siguiente →
            </Link>
          </div>
        )}
      </div>

      {/* ── Main: chat view ───────────────────────────────────────────── */}
      {!activeConversation ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 text-muted-foreground">
          <MessageCircle className="h-10 w-10 opacity-20" />
          <p className="text-sm">Selecciona una conversación para ver el historial</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 bg-background">

          {/* Chat header */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
              {initials(activeConversation.customer?.name, activeConversation.whatsapp_phone)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayName(activeConversation)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{activeConversation.whatsapp_phone}</span>
              </div>
            </div>
            {activeConversation.customer && (
              <Link
                href={`/patients/${activeConversation.customer.id}`}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0 border border-violet-500/30 rounded-lg px-2.5 py-1.5"
              >
                <User className="h-3 w-3" />
                Ver {label.toLowerCase()}
              </Link>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No hay mensajes en esta conversación
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.date}>
                  <DateSep date={group.date} />
                  <div className="space-y-1.5">
                    {group.msgs.map(msg => <Bubble key={msg.id} msg={msg} />)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Read-only notice */}
          <div className="px-5 py-3 border-t border-border bg-muted/20 shrink-0">
            <p className="text-xs text-muted-foreground text-center">
              Historial de solo lectura · Las respuestas se envían automáticamente por el bot de WhatsApp
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
