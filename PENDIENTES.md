# Pendientes — Turno

Registro de todo lo que falta para que Turno quede al 100% con soporte para tenants de barbería y fisioterapia.

---

## Infraestructura (operador)

- [ ] Adquirir número de WhatsApp y configurar UltraMsg
- [ ] Verificar dominio `quickturno.app` en Resend y configurar DNS (SPF, DKIM)
- [ ] Agregar variable `CRON_SECRET` en Vercel (generarla con `openssl rand -hex 32`)
- [ ] Registrar webhook en Stripe apuntando a `https://quickturno.app/api/stripe-webhook`
      Eventos requeridos: `checkout.session.completed`, `invoice.payment_succeeded`,
      `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Agregar variables de entorno en Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Crear los 5 productos en el dashboard de Stripe con sus precios en MXN:
      `landing` $899, `turno-sys` $1,299, `turno-ai` $2,799, `bundle-sys` $1,799, `bundle-ai` $3,299

---

## Onboarding

- [ ] Generar slug automáticamente al crear la org (derivado del nombre del negocio)
- [ ] Agregar paso para subir logo y definir color de marca durante el registro

---

## Pacientes / Fisioterapia

- [ ] Botón para revocar portal del paciente desde su perfil (llama a DELETE `/api/portal-token`)
- [ ] Campo email visible y editable en la ficha del paciente (columna ya existe en DB)
- [ ] Indicador de `confirmation_status` en la tarjeta de cita (✅ confirmada / ⚠ riesgo / ❌ declinada)

---

## Citas

- [ ] Mostrar estado de confirmación por cita en `/appointments`
- [ ] Flujo de reagendamiento cuando un paciente declina la confirmación

---

## Finanzas

- [ ] Adaptar `/finanzas` para barbería (las comisiones son específicas de fisioterapia)
- [ ] Exportar reporte financiero (CSV o PDF)

---

## Settings

- [ ] UI para subir logo del negocio (campo `logo_url` en DB listo)
- [ ] Color picker para color de marca (campo `primary_color` en DB listo)
- [ ] Tipo de negocio editable después del onboarding

---

## Booking page pública `/book/[slug]`

- [ ] Guiar al usuario desde el dashboard a configurar su slug si aún no lo tiene
- [ ] Botón "Ver mi página de reservas" en settings para previsualizar

---

## Barbería

- [ ] Lista de espera
- [ ] Agrupación de servicios con variantes en la booking page

---

## Stripe (verificación)

- [ ] Verificar que `SubscriptionGate` bloquea correctamente en producción con suscripción suspendida/cancelada
- [ ] Verificar flujo completo: checkout → webhook → `subscription_status = active` en Supabase

---

## QA (requiere WhatsApp + Resend activos)

- [ ] Flujo completo de confirmación: recordatorio → paciente responde SI/NO → estado actualizado
- [ ] Email de recordatorio real con Resend
- [ ] Alerta al terapeuta por citas sin confirmar (cron confirmation-check)
- [ ] Portal del paciente end-to-end: generar link → WhatsApp → abrir portal
- [ ] Booking page end-to-end: seleccionar servicio → fecha → datos → abrir WhatsApp

---

## Post-lanzamiento (fuera de alcance actual)

- [ ] Google Reserve
- [ ] Consentimiento informado digital
- [ ] Facturación electrónica (CFDI)
- [ ] Estadísticas por terapeuta
- [ ] Reportes exportables avanzados
