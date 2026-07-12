export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'insurance' | 'other'
export type PaymentStatus = 'paid' | 'pending' | 'refunded'
export type AttachmentCategory = 'xray' | 'mri' | 'lab' | 'prescription' | 'referral' | 'other'
export type NoteType = 'session' | 'soap' | 'clinical' | 'evolution' | 'intake'
export type TreatmentPlanStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type StaffRole = 'owner' | 'manager' | 'staff' | 'therapist' | 'receptionist'
export type ActorType = 'user' | 'bot' | 'system'
export type MessageRole = 'user' | 'assistant'
export type ConversationStatus = 'active' | 'closed'
export type CancelledBy = 'customer' | 'staff' | 'system'

export interface Organization {
  id: string
  name: string
  slug: string
  business_type: 'barbershop' | 'spa' | 'psychology' | 'dentistry' | 'physiotherapy' | 'other' | null
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
  logo_url: string | null
  primary_color: string | null
  ultramsg_instance: string | null
  ultramsg_token: string | null
  is_founder_fallback: boolean
  deposit_enabled: boolean
  deposit_amount: number
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
  commission_type: 'percentage' | 'fixed_per_session' | null
  commission_value: number | null
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
  // Phase 1 clinical fields
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
  occupation: string | null
  allergies: string | null
  medical_notes: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  email: string | null
  portal_token: string | null
  referred_by: string | null
  referring_doctor: string | null
  referring_doctor_specialty: string | null
  referring_doctor_phone: string | null
  civil_status: string | null
  insurance_provider: string | null
  insurance_policy: string | null
  curp: string | null
  rfc: string | null
  blood_type: string | null
  main_diagnosis: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AppointmentNote {
  id: string
  appointment_id: string
  organization_id: string
  staff_id: string | null
  note_type: NoteType
  soap_subjective: string | null
  soap_objective: string | null
  soap_assessment: string | null
  soap_plan: string | null
  content: string | null
  pain_level: number | null
  blood_pressure: string | null
  heart_rate: number | null
  weight_kg: number | null
  rom_cervical: string | null
  rom_shoulder_l: string | null
  rom_shoulder_r: string | null
  rom_lumbar: string | null
  rom_hip_l: string | null
  rom_hip_r: string | null
  rom_knee_l: string | null
  rom_knee_r: string | null
  rom_ankle_l: string | null
  rom_ankle_r: string | null
  rom_custom: string | null
  functional_goals: string | null
  next_session_plan: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface TreatmentPlan {
  id: string
  organization_id: string
  customer_id: string
  staff_id: string | null
  title: string
  diagnosis: string | null
  goals: string | null
  total_sessions: number | null
  sessions_done: number
  status: TreatmentPlanStatus
  starts_at: string | null
  ends_at: string | null
  notes: string | null
  price_per_session: number | null
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  organization_id: string
  customer_id: string
  appointment_id: string | null
  treatment_plan_id: string | null
  name: string
  storage_path: string
  file_url: string
  mime_type: string | null
  file_size_bytes: number | null
  category: AttachmentCategory
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Payment {
  id: string
  organization_id: string
  customer_id: string
  appointment_id: string | null
  treatment_plan_id: string | null
  staff_id: string | null
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  concept: string | null
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  organization_id: string
  branch_id: string | null
  customer_id: string
  staff_id: string
  confirmation_status: 'pending' | 'confirmed' | 'declined' | 'risk' | null
  confirmation_sent_at: string | null
  service_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  cancelled_by: CancelledBy | null
  cancellation_reason: string | null
  notes: string | null
  reminder_sent_at: string | null
  deposit_status: 'none' | 'pending' | 'paid'
  deposit_amount: number | null
  stripe_checkout_session_id: string | null
  deposit_checkout_url: string | null
  deposit_expires_at: string | null
  deposit_paid_at: string | null
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
