import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { isMedicalVertical } from '@/lib/business-type'
import { ConversationsLayout } from './conversations-layout'

interface Props {
  searchParams: Promise<{ id?: string; page?: string }>
}

const PAGE_SIZE = 30

export default async function ConversationsPage({ searchParams }: Props) {
  const { id: selectedId, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)
  const { organization } = await requireOrganization()
  const db = createServiceClient()

  const from = (page - 1) * PAGE_SIZE
  const { data: conversations, count } = await db
    .from('conversations')
    .select('*, customer:customers(id, name, phone)', { count: 'exact' })
    .eq('organization_id', organization.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // Load messages for selected conversation (may live outside the current page)
  let messages = null
  let activeConversation = (conversations ?? []).find(c => c.id === selectedId) ?? null
  if (selectedId && !activeConversation) {
    const { data } = await db
      .from('conversations')
      .select('*, customer:customers(id, name, phone)')
      .eq('id', selectedId)
      .eq('organization_id', organization.id)
      .maybeSingle()
    activeConversation = data
  }
  if (activeConversation) {
    const { data } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConversation.id)
      .order('created_at', { ascending: true })
    messages = data
  }

  return (
    <ConversationsLayout
      conversations={conversations ?? []}
      selectedId={selectedId ?? null}
      activeConversation={activeConversation ?? null}
      messages={messages ?? []}
      isMedical={isMedicalVertical(organization.business_type)}
      page={page}
      totalPages={totalPages}
    />
  )
}
