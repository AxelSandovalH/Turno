interface TrialEndingProps {
  businessName: string
  planName: string
  priceLabel: string
  /** Fecha de cobro ya formateada, ej. "viernes 17 de octubre" */
  chargeDate: string
  manageUrl: string
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function trialEndingSubject(chargeDate: string): string {
  return `Tu prueba gratis de QuickTurno termina el ${chargeDate}`
}

export function trialEndingHtml({ businessName, planName, priceLabel, chargeDate, manageUrl }: TrialEndingProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu prueba gratis termina pronto</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">QuickTurno</span>
            </td>
          </tr>
          <tr>
            <td style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:36px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ebebeb;letter-spacing:-0.02em;">
                Tu prueba gratis termina el ${esc(chargeDate)}
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#8a8a8a;line-height:1.6;">
                Hola, la prueba de <strong style="color:#ebebeb;">${esc(businessName)}</strong> está por terminar. Queremos que no te tome por sorpresa.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #232323;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;">Plan</p>
                    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#ebebeb;">${esc(planName)}</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;">Cobro el ${esc(chargeDate)}</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#ebebeb;">${esc(priceLabel)} MXN a la tarjeta que registraste</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#ebebeb;">¿Quieres continuar?</p>
              <p style="margin:0 0 18px;font-size:13px;color:#8a8a8a;line-height:1.6;">No tienes que hacer nada. Tu plan sigue activo y todo se queda como está.</p>

              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#ebebeb;">¿Prefieres cancelar?</p>
              <p style="margin:0 0 28px;font-size:13px;color:#8a8a8a;line-height:1.6;">Cancela antes del ${esc(chargeDate)} y no se te cobra nada. Lo haces tú mismo en menos de un minuto.</p>

              <a href="${esc(manageUrl)}"
                style="display:block;text-align:center;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:12px;">
                Administrar mi suscripción →
              </a>
              <p style="margin:14px 0 0;font-size:12px;color:#555555;text-align:center;">En Configuración, toca &ldquo;Administrar suscripción&rdquo;.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#555555;">
                QuickTurno · <a href="https://www.quickturno.app" style="color:#777777;">quickturno.app</a>
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#555555;">
                ¿Dudas? Escríbenos a <a href="mailto:equipo@quickturno.app" style="color:#777777;">equipo@quickturno.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function trialEndingText({ businessName, planName, priceLabel, chargeDate, manageUrl }: TrialEndingProps): string {
  return `Tu prueba gratis de QuickTurno termina el ${chargeDate}

Hola, la prueba de ${businessName} está por terminar.

Plan: ${planName}
Cobro el ${chargeDate}: ${priceLabel} MXN a la tarjeta que registraste.

¿Quieres continuar? No tienes que hacer nada.
¿Prefieres cancelar? Cancela antes del ${chargeDate} y no se te cobra nada.

Administrar mi suscripción: ${manageUrl}
(En Configuración, toca "Administrar suscripción".)

¿Dudas? equipo@quickturno.app`
}
