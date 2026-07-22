# Pendientes — Turno

Registro de todo lo que falta para que Turno quede al 100% con soporte para tenants de barbería, spa, fisioterapia y laboratorio.

**Estado general:** el código está listo para el primer tenant. Lo que bloquea el lanzamiento ya no es desarrollo — es la infraestructura del operador (WhatsApp, Resend, Stripe) y el QA end-to-end que depende de ella.

---

## Infraestructura (operador) — BLOQUEANTE para el lanzamiento

- [ ] Configurar instancia UltraMsg del primer tenant
- [*] Verificar dominio `quickturno.app` en Resend y configurar DNS (SPF, DKIM)
      (ahora también lo usa el reporte de laboratorio por email, además de bienvenida y recordatorios)
- [*] Agregar variable `CRON_SECRET` en Vercel (generarla con `openssl rand -hex 32`)

---

## QA — el chat de prueba web ya desbloquea la mitad

**Probable ya, con el chat de prueba del dashboard (sin WhatsApp):**

- [ ] Flujo del agente: agendar → cancelar → reagendar vía chat de prueba
- [*] Anticipo por Stripe en el flujo del agente (requiere `STRIPE_SECRET_KEY` en Vercel;
      activado en Piedi Carino con $100 MXN — ninguna cita en producción tiene aún
      `deposit_status` distinto de `none`)
- [*] Cron deposit-timeout: cancelación real cuando el anticipo no se paga a tiempo

**Bloqueado hasta tener WhatsApp + Resend activos:**

- [ ] Flujo completo de confirmación: recordatorio → paciente responde SI/NO → estado actualizado
- [*] Email de recordatorio real con Resend
- [*] Alerta al staff por citas sin confirmar (cron confirmation-check)
- [ ] Portal del paciente end-to-end: generar link → WhatsApp → abrir portal
- [ ] Booking page end-to-end: seleccionar servicio → fecha → datos → abrir WhatsApp
- [ ] Laboratorio: envío del reporte de resultados por WhatsApp y email reales

---

## Mejoras no bloqueantes (post-primer-tenant)

### Onboarding
- [ ] Agregar al wizard checklist subir logo y definir color de tenant (hoy solo post-registro en /settings)

### Citas
- [ ] Reagendamiento automático y proactivo cuando confirmation-check marca una cita como `risk`
      (hoy el reagendamiento existe pero es reactivo: el paciente debe pedirlo en la conversación)

### Barbería / Spa
- [ ] Lista de espera
- [ ] Agrupación de servicios con variantes en la booking page

### Seguridad
- [ ] Rotar la contraseña demo de Piedi Carino si pasa a ser tenant real
      (está hardcodeada en `scripts/seed-piedicarino.ts`)

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

### Perfil Laboratorio (Fases 0–5)
- [x] Business Profile registry — capacidades por perfil (`hasCapability()`), sidebar por perfil
- [x] Schema del laboratorio (migración 013) + catálogo de estudios y analitos
- [x] Recepción y órdenes, lista de trabajo y captura de resultados
- [x] Documentos: recibo, cotización y reporte de resultados
- [x] Cédula NOM-007 del responsable en la firma del reporte
- [x] Envío del reporte por WhatsApp y por email (Resend), según datos del paciente
- [x] Seeds de demo (catálogo, pacientes y órdenes)

### Agente conversacional / WhatsApp
- [x] Chat de prueba del bot en el dashboard — mismo `runAgent()`, sin necesitar WhatsApp
- [x] UltraMsg multi-tenant — instancia y token por organización, con fallback a la instancia fundadora
- [x] Fix: el bot no respondía a clientes reales en la instancia fundadora
- [x] Fix: fallback fundador ambiguo con múltiples orgs sin instancia propia
- [x] Fix: el bot reciclaba links de anticipo del historial tras desactivar la función
- [x] Fix: horarios pre-formateados en hora local — fin de las conversiones de zona horaria alucinadas
- [x] Fix: el bot asumía años incorrectos — ahora recibe fecha real con timezone de la org
- [x] Fix: el bot dejaba de buscar disponibilidad y derivaba al negocio en vez de reintentar días siguientes
- [x] Anticipo por Stripe al agendar por WhatsApp — checkout, cron de expiración, confirmación por webhook
- [x] Notificación al dueño cuando el bot cancela o reagenda una cita
- [x] Reagendamiento manual vía conversación (tool `reschedule_appointment`)

### Citas y dashboard
- [x] Estado unificado con `confirmation_status` en lista y day view (`resolveStatus()`)
- [x] Vista Por hora con posicionamiento correcto y 3 niveles de densidad
- [x] Calendario como vista principal, tooltips, click en día → filtra Lista por fecha
- [x] Modal de detalle al hacer click en una cita de Lista, con quick actions
- [x] Botón "Hoy" para regresar al día actual desde la vista filtrada
- [x] cancelRate en /analytics incluye `confirmation_status = declined` y `no_show`
- [x] Checklist de configuración inicial (servicios, horarios, slug, probar bot)
- [x] Paginación en Pacientes (50/pág) y Conversaciones (30/pág)

### Multi-vertical
- [x] Giro "Spa / Belleza" con etiquetas propias e iconos de sidebar
- [x] Labels dinámicos Barbero / Fisioterapeuta / Especialista según perfil
- [x] Secciones clínicas de /patients ocultas para tenants no médicos
      (solo Ficha, Pagos y Citas; sin SOAP, planes, evolución ni archivos)
- [x] /finanzas adaptado para barbería (oculta comisiones)
- [x] Tipo de negocio no editable post-onboarding (decisión de producto)

### Identidad y pacientes
- [x] Logo del negocio — Storage, preview en settings y sidebar; color picker de marca
- [x] Favicon con la marca circular + fallbacks PNG/ICO para Safari
- [x] Botón "Ver mi página de reservas" + QR imprimible (PNG / imprimir)
- [x] Slug generado automáticamente al crear la organización
- [x] Campo email visible y editable en ficha del paciente
- [x] Botón "Revocar acceso" al portal; portal muestra citas próximas correctamente

### Finanzas
- [x] Exportar reporte a Excel (fecha/concepto/método/monto/cliente)
- [x] Gráfica de pastel para método de pago

### Stripe / suscripciones
- [x] SubscriptionGate bloquea trialing/suspended/canceled
- [x] Webhook actualiza `subscription_status` en los 4 eventos
- [x] Fix: typo que bloqueaba cancelaciones de suscripción
