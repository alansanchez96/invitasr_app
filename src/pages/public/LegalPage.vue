<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

type LegalSection = {
  title: string
  body: string[]
}

type LegalDocument = {
  kicker: string
  title: string
  intro: string
  updatedAt: string
  sections: LegalSection[]
}

const route = useRoute()
const isPrivacy = computed(() => route.name === 'privacy')

const termsDocument: LegalDocument = {
  kicker: 'Condiciones de uso',
  title: 'Terminos y Condiciones',
  intro:
    'Estos terminos explican como funciona InvitaSR, que puedes hacer con la plataforma y que responsabilidades existen al crear, pagar y publicar invitaciones digitales.',
  updatedAt: '9 de mayo de 2026',
  sections: [
    {
      title: '1. Que es InvitaSR',
      body: [
        'InvitaSR es una plataforma para crear, editar, publicar y gestionar invitaciones digitales. Incluye herramientas para personalizar textos, imagenes, musica, ubicaciones, confirmaciones de asistencia, mensajes y otras funciones disponibles segun el plan contratado.',
        'El servicio esta pensado para personas y negocios que necesitan compartir eventos de forma digital, clara y visual.',
      ],
    },
    {
      title: '2. Planes, creditos y publicaciones',
      body: [
        'Basic y Pro funcionan como planes de pago unico. Planner funciona como suscripcion recurrente.',
        'Los creditos se consumen al publicar una invitacion, no al crear o editar un borrador.',
        'Cada plan puede tener limites de invitaciones activas, plantillas, imagenes, funciones y tiempo de permanencia online. Esos limites se muestran antes de comprar y pueden actualizarse cuando InvitaSR publique nuevas condiciones.',
      ],
    },
    {
      title: '3. Invitaciones activas, baja y enlaces publicos',
      body: [
        'Una invitacion publicada puede quedar activa mientras el plan, la suscripcion o los limites contratados lo permitan.',
        'Si decides dar de baja una invitacion activa, esa accion puede ser definitiva. Es posible que pierdas el acceso al enlace publico asociado y que no puedas reactivar esa misma invitacion.',
        'Los borradores pueden editarse antes de publicar, siempre que respeten las reglas del plan.',
      ],
    },
    {
      title: '4. Pagos, suscripciones y mejoras de plan',
      body: [
        'Los pagos pueden procesarse mediante proveedores externos como Stripe o MercadoPago. InvitaSR no almacena los datos completos de tarjetas.',
        'Si contratas Planner, la suscripcion puede renovarse automaticamente hasta que sea cancelada segun las reglas del proveedor de pago.',
        'Al mejorar de Basic a Pro mantienes tus creditos acumulados e invitaciones activas. Al pasar a Planner, los creditos dejan de aplicar porque el plan ofrece invitaciones ilimitadas mientras la suscripcion este activa.',
      ],
    },
    {
      title: '5. Contenido cargado por clientes',
      body: [
        'Eres responsable de los textos, imagenes, musica, ubicaciones, datos de invitados y cualquier otro contenido que cargues en InvitaSR.',
        'Debes contar con permisos suficientes para usar imagenes, canciones, marcas, nombres, datos personales o cualquier contenido protegido por derechos de terceros.',
      ],
    },
    {
      title: '6. Uso aceptable',
      body: [
        'No esta permitido usar InvitaSR para contenido ilegal, abusivo, discriminatorio, fraudulento, enganoso, violento, sexualmente explicito no autorizado, spam, malware o infracciones de derechos de terceros.',
        'InvitaSR puede suspender o limitar cuentas, invitaciones o accesos si detecta abuso, fraude, incumplimiento de estos terminos o riesgos para la plataforma.',
      ],
    },
    {
      title: '7. Demos',
      body: [
        'Las demos permiten probar plantillas y funciones antes de comprar. Pueden ser temporales, tener marca de agua y caducar por tiempo o por cantidad de visitas.',
        'Si compras un plan compatible, InvitaSR puede conservar los cambios realizados en la demo y convertirlos en una invitacion editable dentro de tu cuenta.',
      ],
    },
    {
      title: '8. Disponibilidad y soporte',
      body: [
        'Trabajamos para mantener el servicio disponible y estable, pero no prometemos disponibilidad absoluta salvo que exista un acuerdo escrito especifico.',
        'Para soporte, consultas comerciales o legales puedes escribir a hola@invitasr.com.',
      ],
    },
    {
      title: '9. Revision legal',
      body: [
        'Este documento es una base operativa para InvitaSR. Antes de usarlo como documento legal final en produccion, debe ser revisado por asesoria legal segun los paises donde opere el servicio.',
      ],
    },
  ],
}

const privacyDocument: LegalDocument = {
  kicker: 'Cuidado de datos',
  title: 'Politica de Privacidad',
  intro:
    'Esta politica explica que datos usamos para operar InvitaSR, para que los usamos y como puedes solicitar acceso, correccion o eliminacion cuando corresponda.',
  updatedAt: '9 de mayo de 2026',
  sections: [
    {
      title: '1. Datos que podemos tratar',
      body: [
        'Datos de cuenta: nombre, apellido, correo, pais, estado de cuenta, plan contratado y preferencias de notificacion.',
        'Datos de invitaciones: titulo, tipo de evento, plantilla, textos editados, imagenes, musica, ubicaciones, preguntas frecuentes, dress code, contador, save date, RSVP y mensajes.',
        'Datos de invitados: nombre, apellido, restricciones alimenticias, confirmacion de asistencia, fecha del registro y mensajes publicados en la invitacion.',
      ],
    },
    {
      title: '2. Pagos y facturacion',
      body: [
        'InvitaSR puede guardar informacion del pago como proveedor, monto, moneda, estado, concepto, fechas e identificadores necesarios para conciliacion y soporte.',
        'Los datos completos de tarjetas son gestionados por proveedores de pago como Stripe o MercadoPago. InvitaSR no almacena el numero completo de tarjeta ni el codigo de seguridad.',
      ],
    },
    {
      title: '3. Estadisticas y seguridad',
      body: [
        'Podemos registrar visitas a invitaciones, ultima visita, fecha de confirmaciones y actividad necesaria para mostrar estadisticas del plan contratado.',
        'Para evitar conteos duplicados, podemos usar datos tecnicos como IP, dispositivo o navegador dentro de ventanas de tiempo razonables, por ejemplo 12 horas.',
        'Tambien podemos usar datos tecnicos para prevenir abuso, fraude, accesos no autorizados o problemas de seguridad.',
      ],
    },
    {
      title: '4. Correos y notificaciones',
      body: [
        'Podemos enviar correos operativos relacionados con seguridad, recuperacion de cuenta, pagos, confirmaciones de asistencia, mensajes recibidos o cambios relevantes del servicio.',
        'Las comunicaciones comerciales o de novedades deben poder gestionarse desde las preferencias de notificacion cuando esten disponibles.',
      ],
    },
    {
      title: '5. Archivos, almacenamiento y proveedores',
      body: [
        'Las imagenes, musica y archivos pueden almacenarse localmente o mediante proveedores externos de almacenamiento, hosting o CDN segun la configuracion tecnica vigente.',
        'Podemos trabajar con proveedores de email, pagos, hosting, analitica, almacenamiento y herramientas necesarias para operar InvitaSR.',
      ],
    },
    {
      title: '6. Cookies y tecnologias similares',
      body: [
        'Usamos cookies o tecnologias similares para mantener la sesion, proteger accesos, recordar preferencias y operar funciones necesarias del sitio.',
        'Si incorporamos analitica o marketing, se debera informar y gestionar segun corresponda.',
      ],
    },
    {
      title: '7. Retencion y eliminacion',
      body: [
        'Conservamos datos mientras sean necesarios para operar la cuenta, cumplir obligaciones legales, resolver disputas, mantener seguridad o prestar soporte.',
        'Las demos pueden caducar por tiempo o visitas. Las invitaciones reales pueden conservarse segun el plan, estado de publicacion, suscripcion y reglas de retencion aplicables.',
      ],
    },
    {
      title: '8. Tus derechos',
      body: [
        'Puedes solicitar acceso, correccion, actualizacion o eliminacion de tus datos escribiendo a hola@invitasr.com.',
        'Si aplica la normativa argentina de datos personales, la Agencia de Acceso a la Informacion Publica es la autoridad de control para reclamos y consultas sobre proteccion de datos personales.',
      ],
    },
    {
      title: '9. Revision legal',
      body: [
        'Esta politica es una base operativa para InvitaSR. Antes de usarla como politica legal final en produccion, debe ser revisada por asesoria legal segun los paises donde opere el servicio.',
      ],
    },
  ],
}

const document = computed(() => (isPrivacy.value ? privacyDocument : termsDocument))
</script>

<template>
  <main class="legal-page">
    <section class="legal-hero">
      <span class="legal-kicker">{{ document.kicker }}</span>
      <h1>{{ document.title }}</h1>
      <p>{{ document.intro }}</p>
      <small>Ultima actualizacion: {{ document.updatedAt }}</small>
    </section>

    <section class="legal-card" :aria-label="document.title">
      <article v-for="section in document.sections" :key="section.title" class="legal-section">
        <h2>{{ section.title }}</h2>
        <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.legal-page {
  display: grid;
  gap: 24px;
  padding: 124px 20px 64px;
  background:
    radial-gradient(circle at 8% 8%, rgba(155, 107, 255, 0.16), transparent 30%),
    radial-gradient(circle at 92% 12%, rgba(240, 106, 166, 0.14), transparent 32%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 100%);
}

.legal-hero,
.legal-card {
  width: min(100%, 920px);
  margin-inline: auto;
}

.legal-hero {
  display: grid;
  gap: 12px;
}

.legal-kicker {
  width: fit-content;
  padding: 7px 12px;
  border: 1px solid rgba(155, 107, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.legal-hero h1 {
  margin: 0;
  color: #211436;
  font-size: clamp(40px, 8vw, 74px);
  line-height: 0.92;
  letter-spacing: -0.07em;
}

.legal-hero p {
  max-width: 760px;
  margin: 0;
  color: #5f5276;
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.55;
}

.legal-hero small {
  color: #7b6f95;
  font-weight: 700;
}

.legal-card {
  display: grid;
  gap: 4px;
  padding: clamp(20px, 4vw, 34px);
  border: 1px solid rgba(226, 218, 247, 0.92);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 28px 64px rgba(90, 48, 140, 0.12);
}

.legal-section {
  padding: 18px 0;
  border-bottom: 1px solid rgba(226, 218, 247, 0.78);
}

.legal-section:last-child {
  border-bottom: 0;
}

.legal-section h2 {
  margin: 0 0 10px;
  color: #2c1c46;
  font-size: clamp(19px, 2.2vw, 24px);
  letter-spacing: -0.03em;
}

.legal-section p {
  margin: 0 0 10px;
  color: #5f5276;
  line-height: 1.7;
}

.legal-section p:last-child {
  margin-bottom: 0;
}

@media (max-width: 720px) {
  .legal-page {
    padding: 96px 12px 42px;
  }

  .legal-card {
    border-radius: 22px;
  }
}
</style>
