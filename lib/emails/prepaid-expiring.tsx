interface PrepaidExpiringProps {
  businessName: string
  planName: string
  /** Fecha de vencimiento ya formateada, ej. "viernes 17 de octubre" */
  dueDate: string
  renewUrl: string
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function prepaidExpiringSubject(dueDate: string): string {
  return `Tu plan de QuickTurno vence el ${dueDate}`
}

export function prepaidExpiringHtml({ businessName, planName, dueDate, renewUrl }: PrepaidExpiringProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu plan vence pronto</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">QuickTurno</span></td></tr>
          <tr>
            <td style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:36px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ebebeb;letter-spacing:-0.02em;">Tu plan vence el ${esc(dueDate)}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#8a8a8a;line-height:1.6;">
                Hola, el plan <strong style="color:#ebebeb;">${esc(planName)}</strong> de <strong style="color:#ebebeb;">${esc(businessName)}</strong> fue pagado por adelantado y <strong style="color:#ebebeb;">no se renueva solo</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:13px;color:#8a8a8a;line-height:1.6;">
                Renueva antes del ${esc(dueDate)} con OXXO, transferencia SPEI o tarjeta y no pierdes el acceso. Los días que te queden se suman al nuevo periodo.
              </p>
              <a href="${esc(renewUrl)}" style="display:block;text-align:center;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:12px;">
                Renovar mi plan →
              </a>
              <p style="margin:14px 0 0;font-size:12px;color:#555555;text-align:center;">Si no renuevas, tu cuenta se pausa y tu información se conserva.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#555555;">QuickTurno · <a href="https://www.quickturno.app" style="color:#777777;">quickturno.app</a></p>
              <p style="margin:4px 0 0;font-size:11px;color:#555555;">¿Dudas? Escríbenos a <a href="mailto:equipo@quickturno.app" style="color:#777777;">equipo@quickturno.app</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function prepaidExpiringText({ businessName, planName, dueDate, renewUrl }: PrepaidExpiringProps): string {
  return `Tu plan de QuickTurno vence el ${dueDate}

Hola, el plan ${planName} de ${businessName} fue pagado por adelantado y no se renueva solo.

Renueva antes del ${dueDate} con OXXO, transferencia SPEI o tarjeta y no pierdes el acceso. Los días que te queden se suman al nuevo periodo.

Renovar mi plan: ${renewUrl}

Si no renuevas, tu cuenta se pausa y tu información se conserva.

¿Dudas? equipo@quickturno.app`
}
