# Turno

Recepcionista digital para negocios basados en citas. Opera 24/7 por WhatsApp — agenda, confirma, reagenda y cancela citas de forma automática usando IA.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui |
| Backend | Next.js API Routes |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| IA | Anthropic Claude API |
| WhatsApp | UltraMsg |
| Pagos | Stripe |
| Deploy | Vercel |

## Estructura del proyecto

```
turno/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── appointments/     # vista de citas del día
│   │   ├── staff/            # gestión de barberos
│   │   ├── services/         # servicios y precios
│   │   ├── schedule/         # horarios y bloqueos
│   │   └── settings/         # configuración del negocio
│   └── api/
│       ├── onboarding/       # creación de organización en registro
│       ├── webhook/
│       │   ├── whatsapp/     # entrada de mensajes UltraMsg
│       │   └── stripe/       # eventos de suscripción
│       ├── appointments/     # CRUD de citas
│       └── availability/     # slots disponibles
├── lib/
│   ├── agent/                # Claude booking agent
│   │   ├── agent.ts
│   │   ├── tools.ts
│   │   └── prompts.ts
│   └── supabase/
│       ├── client.ts         # browser client
│       ├── server.ts         # server component client
│       └── service.ts        # service role (API routes only)
├── components/
│   ├── ui/                   # shadcn/ui
│   └── dashboard/            # componentes del panel
├── types/
│   └── database.ts           # tipos TypeScript del schema
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── middleware.ts             # auth guard
```

## Setup local

### 1. Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [UltraMsg](https://ultramsg.com)
- Cuenta en [Stripe](https://stripe.com)
- API key de [Anthropic](https://console.anthropic.com)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

```bash
cp .env.example .env.local
# Rellena los valores en .env.local
```

### 4. Base de datos

En el SQL Editor de tu proyecto Supabase, ejecuta:

```
supabase/migrations/001_initial_schema.sql
```

### 5. Correr en desarrollo

```bash
npm run dev
```

### 6. Webhook local para WhatsApp

```bash
npx ngrok http 3000
# Configura https://xxxx.ngrok.io/api/webhook/whatsapp en UltraMsg
```

## Cómo funciona el agente

```
Cliente WhatsApp → UltraMsg webhook → /api/webhook/whatsapp
                                              │
                                     Identifica tenant
                                     por número de WhatsApp
                                              │
                                     Carga contexto + historial
                                              │
                                     Claude API con tools
                                              │
                         ┌────────────────────┼───────────────────┐
                         │                    │                   │
                  get_available_slots  create_appointment  cancel_appointment
                                              │
                                     Respuesta por UltraMsg
```

## Pricing

| Plan | Precio |
|---|---|
| Setup | $800 MXN (one-time) |
| Starter | $399 MXN/mes — hasta 3 barberos |
| Pro | $699 MXN/mes — ilimitado |

Trial: 14 días gratis, sin tarjeta.

## Roadmap

- [x] Schema de base de datos
- [x] Auth + onboarding
- [x] Dashboard shell (citas del día)
- [ ] Gestión de staff, servicios y horarios
- [ ] Agente Claude + webhook UltraMsg
- [ ] Recordatorios automáticos
- [ ] Stripe subscriptions + trial
- [ ] Suspensión automática por falta de pago

## Licencia

Privado. Todos los derechos reservados.
