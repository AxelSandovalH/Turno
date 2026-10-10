export interface DemoPhoto { src: string; alt: string }

export interface DemoService { name: string; description: string; price: number; durationMin: number; photo: DemoPhoto | null }
export interface DemoAgendaRow { time: string; service: string; client: string; staff: string }
export interface DemoChatMsg { from: 'customer' | 'bot'; text: string; time: string }

/** Lo que la IA entrega y la landing dibuja: datos de EJEMPLO, no del negocio real. */
export interface DemoPlan {
  businessName: string
  tagline: string
  segment: string
  accent: string
  staffLabel: string
  staff: string[]
  services: DemoService[]
  agenda: DemoAgendaRow[]
  chat: DemoChatMsg[]
  heroPhoto: DemoPhoto | null
}
