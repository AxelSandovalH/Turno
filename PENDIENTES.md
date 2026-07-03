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

## Citas

- [ ] Flujo de reagendamiento cuando un paciente declina la confirmación

---

## Booking page pública `/book/[slug]`

- [ ] Guiar al usuario desde el dashboard a configurar su slug si aún no lo tiene

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
- [ ] Punto de venta (por validar)

---

## Resuelto

- [x] Indicador de `confirmation_status` en citas — lista y day view con `resolveStatus()`
- [x] Columna Estado unificada en `/appointments` (elimina columna Conf. separada)
- [x] Vista Por hora (`DayView`) con posicionamiento correcto y 3 niveles de densidad
- [x] Label dinámico Barbero / Fisioterapeuta según `business_type`
- [x] Logo del negocio — subida a Storage (`org-assets`) y preview en settings
- [x] Color picker de marca con 5 swatches en settings
- [x] Botón "Ver mi página de reservas" en settings
- [x] Campo email visible y editable en ficha del paciente
- [x] Botón "Revocar acceso" al portal (llama a DELETE `/api/portal-token`)
- [x] Portal del paciente muestra citas próximas con rango horario correcto
- [x] `/finanzas` adaptado para barbería (oculta comisiones si `business_type = barbershop`)
- [x] Exportar reporte financiero a Excel (CSV con BOM UTF-8, columnas: fecha/concepto/método/monto/cliente)
- [x] Gráfica de pastel para método de pago en /finanzas
- [x] Tipo de negocio — no editable post-onboarding (decisión de producto)
