import { Resend } from 'resend'

// El SDK de Resend lanza al construirse si falta la API key — eso tumbaba
// cualquier ruta que importara este módulo (ej. /api/onboarding) incluso
// cuando el email es opcional/best-effort ahí. Sin la key, exportamos un
// stub que falla en el envío (los call sites ya lo tratan como
// fire-and-forget con .catch) en vez de tumbar el import.
export const resend: Resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : ({
      emails: {
        send: async () => {
          console.warn('[resend] RESEND_API_KEY no configurada — email no enviado')
          throw new Error('RESEND_API_KEY no configurada')
        },
      },
    } as unknown as Resend)

export const FROM = 'QuickTurno <equipo@quickturno.app>'
