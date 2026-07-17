interface LabReportEmailProps {
  patientName: string
  businessName: string
  folio: string
  reportUrl: string
}

export function labReportEmailHtml({ patientName, businessName, folio, reportUrl }: LabReportEmailProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Tus resultados están listos</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e2dc;border-radius:16px;padding:36px 32px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;">${businessName}</p>
          <p style="margin:0 0 16px;font-size:21px;font-weight:600;color:#111111;">Tus resultados están listos</p>
          <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.6;">
            Hola ${patientName}, los resultados de tu orden <strong style="font-family:monospace;">${folio}</strong> ya
            están disponibles. Puedes consultarlos e imprimirlos desde el siguiente enlace:
          </p>
          <a href="${reportUrl}"
            style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:12px;margin-bottom:24px;">
            Ver mis resultados
          </a>
          <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">
            El enlace es personal, no lo compartas. Este reporte es informativo y debe ser interpretado por un médico.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#b0b0b0;">${businessName} · Enviado con QuickTurno</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function labReportEmailText({ patientName, businessName, folio, reportUrl }: LabReportEmailProps): string {
  return `Hola ${patientName},

Los resultados de tu orden ${folio} en ${businessName} ya están disponibles:

${reportUrl}

El enlace es personal, no lo compartas. Este reporte es informativo y debe ser interpretado por un médico.`
}
