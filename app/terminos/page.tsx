import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { PLANS, TRIAL_DAYS, TRIAL_MESSAGES, money } from '@/lib/plans'
import { LegalPage, H2, P, UL, contactText } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Términos y condiciones — QuickTurno',
  description: 'Condiciones de uso del servicio QuickTurno: planes, prueba gratis, pagos, cancelación y responsabilidades.',
  alternates: { canonical: '/terminos' },
}

export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones" updated="30 de octubre de 2026">
      <P>Al crear una cuenta o usar {SITE.brand} aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</P>

      <H2>1. El servicio</H2>
      <P>{SITE.brand} es una plataforma para negocios que incluye agenda de citas, página de reservas, pedidos, recordatorios y, opcionalmente, un Asistente de WhatsApp que responde a tus clientes con inteligencia artificial. El servicio lo presta {SITE.legalName}.</P>

      <H2>2. Cuenta</H2>
      <P>Eres responsable de la información que registras, de mantener segura tu contraseña y de la actividad de tu cuenta. Debes ser mayor de edad y tener facultades para contratar a nombre de tu negocio.</P>

      <H2>3. Planes, precios y prueba gratis</H2>
      <UL>
        <li>Los precios vigentes están en quickturno.app, en pesos mexicanos al mes. Hoy van desde {money(PLANS.agenda.amount)} (Agenda) hasta {money(PLANS.tours.amount)} (Tours con Asistente).</li>
        <li>Todos los planes incluyen {TRIAL_DAYS} días de prueba gratis. En la prueba, el Asistente de WhatsApp contesta hasta {TRIAL_MESSAGES} mensajes; al llegar al tope deja de responder hasta que actives tu plan.</li>
        <li>Para la prueba se registra una tarjeta. Si no cancelas antes de que termine, se cobra el primer mes y después cada mes.</li>
        <li>Puedes cancelar cuando quieras desde Configuración; la cancelación aplica al siguiente periodo y no genera penalizaciones. Los pagos ya realizados no son reembolsables salvo que la ley indique lo contrario.</li>
        <li>Podemos modificar los precios avisándote con anticipación razonable.</li>
      </UL>

      <H2>4. Pagos a tus clientes</H2>
      <P>Si activas cobros (anticipos o pedidos), el dinero llega a tu cuenta de Stripe. Eres responsable de tus precios, de la entrega de tus servicios o productos y de tus obligaciones fiscales. Stripe puede cobrar sus propias comisiones.</P>

      <H2>5. Uso aceptable</H2>
      <UL>
        <li>No uses el servicio para spam, fraude, contenido ilegal o que viole derechos de terceros.</li>
        <li>Debes contar con el consentimiento de tus clientes para contactarlos por WhatsApp y respetar las políticas de WhatsApp.</li>
        <li>No intentes vulnerar la seguridad del servicio ni acceder a datos de otros negocios.</li>
      </UL>

      <H2>6. Asistente de inteligencia artificial</H2>
      <P>El Asistente genera respuestas automáticas con IA y puede cometer errores. Eres responsable de revisar la configuración de tu negocio (servicios, precios y horarios) y de atender los casos que requieran a una persona. El Asistente no brinda asesoría médica, legal ni financiera.</P>

      <H2>7. Datos</H2>
      <P>Tus datos y los de tus clientes se tratan conforme a nuestro <a href="/privacidad" style={{ color: '#6d28d9' }}>aviso de privacidad</a>. Sigues siendo dueño de la información que cargas.</P>

      <H2>8. Disponibilidad y responsabilidad</H2>
      <P>Procuramos que el servicio esté disponible, pero depende de terceros (WhatsApp, Stripe, proveedores de infraestructura) y puede tener interrupciones. El servicio se ofrece &quot;tal cual&quot;; en la medida permitida por la ley, nuestra responsabilidad total se limita a lo que hayas pagado en los últimos tres meses y no incluimos daños indirectos como pérdida de ventas.</P>

      <H2>9. Suspensión</H2>
      <P>Podemos suspender o cancelar cuentas que incumplan estos términos o que no paguen su suscripción.</P>

      <H2>10. Cambios y ley aplicable</H2>
      <P>Podemos actualizar estos términos y publicaremos la versión vigente en esta página. Se rigen por las leyes de los Estados Unidos Mexicanos; para cualquier controversia las partes se someten a los tribunales competentes de México.</P>

      <H2>11. Contacto</H2>
      <P>{contactText()}.</P>
    </LegalPage>
  )
}
