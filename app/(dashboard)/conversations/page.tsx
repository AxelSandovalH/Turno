import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { ConversationsLayout } from './conversations-layout'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function ConversationsPage({ searchParams }: Props) {
  const { id: selectedId } = await searchParams
  const { organization } = await requireOrganization()
  const db = createServiceClient()

  // Load all conversations with customer name
  const { data: conversations } = await db
    .from('conversations')
    .select('*, customer:customers(id, name, phone)')
    .eq('organization_id', organization.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(60)

  // Load messages for selected conversation
  let messages = null
  let activeConversation = null
  if (selectedId) {
    const conv = (conversations ?? []).find(c => c.id === selectedId)
    if (conv) {
      activeConversation = conv
      const { data } = await db
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true })
      messages = data
    }
  }

  return (
    <ConversationsLayout
      conversations={conversations ?? []}
      selectedId={selectedId ?? null}
      activeConversation={activeConversation ?? null}
      messages={messages ?? []}
      isMedical={organization.business_type !== 'barbershop'}
    />
  )
}
