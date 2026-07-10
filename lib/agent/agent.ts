import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './prompts'
import { tools } from './tools'
import { handleTool } from './tool-handlers'
import { createServiceClient } from '@/lib/supabase/service'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RunAgentParams {
  organizationId: string
  customerPhone: string
  incomingMessage: string
  ultramsgId?: string
}

export async function runAgent({ organizationId, customerPhone, incomingMessage, ultramsgId }: RunAgentParams): Promise<string> {
  const db = createServiceClient()

  // Load org context
  const { data: org } = await db
    .from('organizations')
    .select('id, name, timezone, welcome_message, away_message, whatsapp_number, ultramsg_instance, ultramsg_token, deposit_enabled, deposit_amount')
    .eq('id', organizationId)
    .single()

  if (!org) return 'Lo sentimos, el negocio no está disponible en este momento.'

  // Load or create branch
  const { data: branch } = await db
    .from('branches')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  // Load customer profile (name, occupation, notes)
  const { data: customer } = await db
    .from('customers')
    .select('name, occupation, notes')
    .eq('organization_id', organizationId)
    .eq('phone', customerPhone)
    .maybeSingle()

  // Upsert conversation
  const { data: conversation } = await db
    .from('conversations')
    .upsert(
      { organization_id: organizationId, whatsapp_phone: customerPhone, status: 'active', last_message_at: new Date().toISOString() },
      { onConflict: 'organization_id,whatsapp_phone' }
    )
    .select('id')
    .single()

  if (!conversation) return 'Error interno. Por favor intenta de nuevo.'

  // Load recent message history (last 10 messages for context)
  const { data: history } = await db
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const messages: MessageParam[] = [
    ...(history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: incomingMessage },
  ]

  // Save incoming message
  await db.from('messages').insert({
    conversation_id: conversation.id,
    organization_id: organizationId,
    role: 'user',
    content: incomingMessage,
    ultramsg_id: ultramsgId ?? null,
  })

  const ctx = {
    organizationId,
    organizationName: org.name,
    branchId: branch?.id ?? '',
    timezone: org.timezone,
    ownerWhatsapp: org.whatsapp_number,
    ultramsg: { instance: org.ultramsg_instance, token: org.ultramsg_token },
    deposit: { enabled: org.deposit_enabled, amount: Number(org.deposit_amount ?? 0) },
  }

  // Agentic loop
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(org, customer ?? undefined),
    tools,
    messages,
  })

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(b => b.type === 'tool_use')
    const toolResults = await Promise.all(
      toolUses.map(async block => {
        if (block.type !== 'tool_use') return null
        console.log(`[agent] tool call: ${block.name}`, JSON.stringify(block.input))
        const result = await handleTool(block.name, block.input as Record<string, string>, ctx)
        console.log(`[agent] tool result: ${block.name} ->`, result.slice(0, 400))
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
      })
    )

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults.filter(Boolean) as Anthropic.ToolResultBlockParam[] })

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(org, customer ?? undefined),
      tools,
      messages,
    })
  }

  const text = response.content.find(b => b.type === 'text')?.text ?? 'No pude procesar tu mensaje. Por favor intenta de nuevo.'

  // Save assistant response
  await db.from('messages').insert({
    conversation_id: conversation.id,
    organization_id: organizationId,
    role: 'assistant',
    content: text,
  })

  // Update conversation timestamp
  await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id)

  return text
}
