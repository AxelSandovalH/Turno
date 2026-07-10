# Pendientes — Turno

Registro de todo lo que falta para que Turno quede al 100% con soporte para tenants de barbería, spa y fisioterapia.

---

## Infraestructura (operador) — bloqueante para QA end-to-end

- [ ] Adquirir número de WhatsApp y configurar instancia UltraMsg del tenant fisio
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

- [ ] Agregar paso para subir logo y definir color de marca durante el registro (hoy solo disponible post-registro en /settings)

---

## Citas

- [ ] Reagendamiento automático y proactivo cuando confirmation-check marca una cita como `risk`
      (hoy el reagendamiento existe pero es reactivo: el paciente debe pedirlo en la conversación)

---

## Barbería / Spa

- [ ] Lista de espera
- [ ] Agrupación de servicios con variantes en la booking page

---

## QA (requiere WhatsApp + Resend activos — bloqueado por Infraestructura)

- [ ] Flujo completo de confirmación: recordatorio → paciente responde SI/NO → estado actualizado
- [ ] Email de recordatorio real con Resend
- [ ] Alerta al terapeuta por citas sin confirmar (cron confirmation-check)
- [ ] Portal del paciente end-to-end: generar link → WhatsApp → abrir portal
- [ ] Booking page end-to-end: seleccionar servicio → fecha → datos → abrir WhatsApp
- [ ] Anticipo por Stripe al agendar por WhatsApp: checkout → pago → confirmación de cita
- [ ] Cron deposit-timeout: cancelación real cuando el anticipo no se paga a tiempo

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
- [x] Label dinámico Barbero / Fisioterapeuta / Estilista según `business_type`
- [x] Logo del negocio — subida a Storage (`org-assets`), preview en settings y en sidebar
- [x] Color picker de marca con 5 swatches en settings
- [x] Botón "Ver mi página de reservas" en settings
- [x] QR imprimible de la página de reservas (descargar PNG / imprimir)
- [x] Campo email visible y editable en ficha del paciente
- [x] Botón "Revocar acceso" al portal (llama a DELETE `/api/portal-token`)
- [x] Portal del paciente muestra citas próximas con rango horario correcto
- [x] `/finanzas` adaptado para barbería (oculta comisiones si `business_type = barbershop`)
- [x] Exportar reporte financiero a Excel (columnas: fecha/concepto/método/monto/cliente)
- [x] Gráfica de pastel para método de pago en /finanzas
- [x] Tipo de negocio — no editable post-onboarding (decisión de producto)
- [x] Slug generado automáticamente al crear la organización (`slugify` + resolución de colisiones)
- [x] Checklist de configuración inicial en el dashboard (servicios, horarios, página de reservas, probar bot)
- [x] Modal de detalle al hacer click en una cita de Lista, con quick actions
- [x] Calendario como vista principal de `/appointments`, con tooltips y click en día → filtra Lista por esa fecha
- [x] Botón "Hoy" para regresar al día actual desde la vista filtrada
- [x] cancelRate en /analytics incluye `confirmation_status = declined` y `no_show`
- [x] UltraMsg multi-tenant — instancia y token por organización, con fallback a la instancia fundadora
- [x] Notificación al dueño cuando el bot cancela o reagenda una cita
- [x] Reagendamiento manual vía conversación de WhatsApp (tool `reschedule_appointment`)
- [x] Anticipo por Stripe al agendar por WhatsApp — checkout, cron de expiración, confirmación por webhook
- [x] SubscriptionGate bloquea trialing/suspended/canceled; webhook de Stripe actualiza `subscription_status` en los 4 eventos
- [x] Giro "Spa / Belleza" agregado como `business_type`, con etiquetas propias e iconos de sidebar
- [x] Fix: el bot asumía años incorrectos al no saber la fecha actual — ahora recibe fecha real con timezone de la org
- [x] Fix: el bot dejaba de buscar disponibilidad y derivaba al negocio en vez de reintentar días siguientes
- [x] Fix: bug de typo que bloqueaba cancelaciones de suscripción
- [x] Paginación en Pacientes (50/pág) y Conversaciones (30/pág)
- [x] Checklist de setup incluye el paso de configurar el slug/página de reservas
