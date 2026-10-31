import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { LegalPage, H2, P, UL, contactText } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Aviso de privacidad — QuickTurno',
  description: 'Cómo QuickTurno trata tus datos personales, con quién los comparte y cómo ejercer tus derechos ARCO.',
  alternates: { canonical: '/privacidad' },
}

export default function Privacidad() {
  return (
    <LegalPage title="Aviso de privacidad" updated="30 de octubre de 2026">
      <P>
        En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), este aviso
        explica cómo se tratan los datos personales que se recaban a través de {SITE.brand} (quickturno.app) y del Asistente de WhatsApp.
      </P>

      <H2>1. Responsable</H2>
      <P>{SITE.legalName} (&quot;{SITE.brand}&quot;) es el responsable del tratamiento de tus datos personales. Contacto: {contactText()}.</P>

      <H2>2. Datos que recabamos</H2>
      <UL>
        <li>De quien contrata el servicio: nombre, nombre del negocio, correo electrónico, número de WhatsApp, datos del negocio (giro, servicios, horarios) y datos de facturación o pago.</li>
        <li>De los clientes finales del negocio (quienes escriben por WhatsApp o reservan): nombre, número de teléfono, mensajes, citas o pedidos y, cuando el negocio lo configura, notas necesarias para atenderlos.</li>
        <li>Datos de uso del sitio: páginas visitadas, clics en botones (por ejemplo, hacia WhatsApp) y datos técnicos del dispositivo, mediante cookies o tecnologías similares.</li>
      </UL>
      <P>No pedimos ni almacenamos números de tarjeta: los pagos los procesa Stripe.</P>

      <H2>3. Para qué los usamos</H2>
      <UL>
        <li>Crear y administrar tu cuenta y prestar el servicio contratado (agenda, pedidos, recordatorios, Asistente de WhatsApp).</li>
        <li>Cobrar la suscripción y los pagos que el negocio solicite a sus clientes.</li>
        <li>Atender solicitudes de soporte, demostraciones y contacto comercial.</li>
        <li>Medir y mejorar el sitio y nuestras campañas de publicidad.</li>
      </UL>
      <P>
        Respecto a los datos de los clientes finales, cada negocio es quien decide para qué los usa; {SITE.brand} los trata por su cuenta
        únicamente para operar el servicio.
      </P>

      <H2>4. Con quién los compartimos</H2>
      <P>Para operar el servicio usamos proveedores que tratan datos por nuestra cuenta: Stripe (pagos), servicios de mensajería de WhatsApp, proveedores de infraestructura y bases de datos (Vercel, Supabase), un proveedor de inteligencia artificial que redacta las respuestas del Asistente (Anthropic) y herramientas de medición y publicidad (Google, Vercel Analytics). No vendemos tus datos. Solo los compartimos con autoridades cuando la ley lo exija.</P>

      <H2>5. Derechos ARCO y revocación</H2>
      <P>Puedes acceder, rectificar o cancelar tus datos, oponerte a su tratamiento o revocar tu consentimiento escribiendo a {contactText()}, con tu nombre, el medio para responderte y la descripción de lo que solicitas. Responderemos en un plazo máximo de 20 días hábiles.</P>

      <H2>6. Cookies y medición</H2>
      <P>Usamos cookies y etiquetas de medición (Google Ads, Vercel Analytics) para saber qué páginas funcionan mejor y medir nuestra publicidad. Puedes desactivarlas desde la configuración de tu navegador.</P>

      <H2>7. Conservación y seguridad</H2>
      <P>Conservamos los datos mientras tengas una cuenta activa y el tiempo necesario para cumplir obligaciones legales. Aplicamos medidas técnicas y administrativas razonables para protegerlos.</P>

      <H2>8. Cambios a este aviso</H2>
      <P>Publicaremos cualquier cambio en esta página con su fecha de actualización.</P>
    </LegalPage>
  )
}
