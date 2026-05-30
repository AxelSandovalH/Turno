export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type StaffRole = 'owner' | 'manager' | 'staff'
export type ActorType = 'user' | 'bot' | 'system'
export type MessageRole = 'user' | 'assistant'
export type ConversationStatus = 'active' | 'closed'
export type CancelledBy = 'customer' | 'staff' | 'system'

export interface Organization {
  id: string
  name: string
  slug: string
  whatsapp_number: string
  phone: string | null
  email: string | null
  address: string | null
  timezone: string
  welcome_message: string | null
  away_message: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  suspended_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  organization_id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  organization_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  organization_id: string
  branch_id: string | null
  user_id: string | null
  name: string
  phone: string | null
  avatar_url: string | null
  role: StaffRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffSchedule {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean
  created_at: string
}

export interface TimeBlock {
  id: string
  organization_id: string
  staff_id: string | null
  starts_at: string
  ends_at: string
  reason: string | null
  created_at: string
}

export interface Customer {
  id: string
  organization_id: string
  name: string | null
  phone: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  organization_id: string
  branch_id: string | null
  customer_id: string
  staff_id: string
  service_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  cancelled_by: CancelledBy | null
  cancellation_reason: string | null
  notes: string | null
  reminder_sent_at: string | null
  created_at: string
  updated_at: string
  // joined
  customer?: Customer
  staff?: Staff
  service?: Service
}

export interface Conversation {
  id: string
  organization_id: string
  customer_id: string | null
  whatsapp_phone: string
  status: ConversationStatus
  last_message_at: string | null
  created_at: string
  customer?: Customer
}

export interface Message {
  id: string
  conversation_id: string
  organization_id: string
  role: MessageRole
  content: string
  ultramsg_id: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  organization_id: string
  actor_id: string | null
  actor_type: ActorType
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
