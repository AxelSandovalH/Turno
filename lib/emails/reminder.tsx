interface ReminderEmailProps {
  customerName: string
  businessName: string
  serviceName: string
  staffName: string
  dateLabel: string   // e.g. "hoy a las 10:00 AM"
}

export function reminderEmailHtml(p: ReminderEmailProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de cita</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">Turno</span>
            </td>
          </tr>

          <tr>
            <td style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:32px 28px;">

              <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#ebebeb;letter-spacing:-0.02em;">
                🔔 Recordatorio de cita
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.6;">
                Hola <strong style="color:#ebebeb;">${p.customerName}</strong>, te recordamos tu próxima cita.
              </p>

              <!-- Cita card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.08em;">
                      ${p.businessName}
                    </p>
                    <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#ebebeb;">${p.serviceName}</p>
                    <p style="margin:0 0 4px;font-size:13px;color:#888888;">Con ${p.staffName}</p>
                    <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#ffffff;">📅 ${p.dateLabel}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">
                Si necesitas cancelar o reagendar, responde el mensaje de WhatsApp que te enviamos o comunícate directamente con el consultorio.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#333333;">
                Turno · Recepcionista digital 24/7
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

export function reminderEmailText(p: ReminderEmailProps): string {
  return `Recordatorio de cita — ${p.businessName}

Hola ${p.customerName},

Tienes una cita programada:
- Servicio: ${p.serviceName}
- Con: ${p.staffName}
- Cuándo: ${p.dateLabel}

Si necesitas cancelar, responde el mensaje de WhatsApp.

Turno · Recepcionista digital`
}
