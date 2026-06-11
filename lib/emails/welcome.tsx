interface WelcomeEmailProps {
  businessName: string
  whatsappNumber: string
}

export function welcomeEmailHtml({ businessName, whatsappNumber }: WelcomeEmailProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a QuickTurno</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">QuickTurno</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:36px 32px;">

              <!-- Headline -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ebebeb;letter-spacing:-0.02em;">
                ¡Bienvenido, ${businessName}! 🎉
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.6;">
                Tu cuenta está lista. Sigue estos 3 pasos para que tu bot de WhatsApp empiece a agendar citas automáticamente.
              </p>

              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:99px;background:#7c3aed22;border:1px solid #7c3aed55;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#a78bfa;text-align:center;line-height:28px;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#ebebeb;">Agrega tus servicios y horarios</p>
                    <p style="margin:0;font-size:13px;color:#555555;line-height:1.5;">
                      Entra a <strong style="color:#ebebeb;">Servicios</strong> y <strong style="color:#ebebeb;">Horarios</strong> para que el bot sepa qué ofreces y cuándo estás disponible.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:99px;background:#7c3aed22;border:1px solid #7c3aed55;font-size:12px;font-weight:700;color:#a78bfa;text-align:center;line-height:28px;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#ebebeb;">Conecta tu WhatsApp</p>
                    <p style="margin:0;font-size:13px;color:#555555;line-height:1.5;">
                      El bot está configurado para el número <strong style="color:#ebebeb;">${whatsappNumber}</strong>. Si necesitas cambiarlo, ve a <strong style="color:#ebebeb;">Configuración</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:99px;background:#7c3aed22;border:1px solid #7c3aed55;font-size:12px;font-weight:700;color:#a78bfa;text-align:center;line-height:28px;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#ebebeb;">Prueba el bot</p>
                    <p style="margin:0;font-size:13px;color:#555555;line-height:1.5;">
                      Mándale un mensaje al número de WhatsApp de tu negocio y verás cómo el bot agenda citas en segundos.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <a href="https://www.quickturno.app/appointments"
                style="display:block;text-align:center;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:12px;">
                Ir al dashboard →
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#333333;">
                QuickTurno · <a href="https://www.quickturno.app" style="color:#555555;">quickturno.app</a>
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#333333;">
                ¿Necesitas ayuda? Escríbenos a <a href="mailto:equipo@quickturno.app" style="color:#555555;">equipo@quickturno.app</a>
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

export function welcomeEmailText({ businessName, whatsappNumber }: WelcomeEmailProps): string {
  return `¡Bienvenido a QuickTurno, ${businessName}!

Tu cuenta está lista. Sigue estos pasos:

1. Agrega tus servicios y horarios en el dashboard.
2. Tu bot está configurado para el número ${whatsappNumber}.
3. Prueba el bot mandándole un mensaje a tu WhatsApp.

Ir al dashboard: https://www.quickturno.app/appointments

¿Necesitas ayuda? equipo@quickturno.app`
}
