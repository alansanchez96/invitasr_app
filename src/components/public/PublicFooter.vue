<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const currentYear = new Date().getFullYear()
const route = useRoute()
const session = useSessionStore()
const isHomeFooter = computed(() => route.name === 'home')

const accountLinks = computed(() => {
  if (!session.isAuthenticated) {
    return [
      { label: 'Explorar planes', href: '/planes' },
      { label: 'Probar demo', href: '/demo' },
      { label: 'Crear cuenta', href: '/planes' },
    ]
  }

  if (session.isMaster) {
    return [
      { label: 'Backoffice', href: '/backoffice' },
      { label: 'Clientes', href: '/backoffice/clients' },
      { label: 'Pagos', href: '/backoffice/payments' },
    ]
  }

  if (session.isClientInactive) {
    return [
      { label: 'Estado de cuenta', href: '/cuenta-inactiva' },
      { label: 'Contactar soporte', href: 'mailto:hola@invitasr.com' },
    ]
  }

  if (session.canRenewSubscription || session.requiresSubscriptionRenewal) {
    return [
      { label: 'Renovar suscripcion', href: '/panel/renovar-suscripcion' },
      { label: 'Mis pagos', href: '/panel/pagos' },
      { label: 'Seguridad', href: '/panel/seguridad' },
    ]
  }

  return [
    { label: 'Mi panel', href: '/panel' },
    { label: 'Mis invitaciones', href: '/panel/invitaciones' },
    { label: 'Mis pagos', href: '/panel/pagos' },
  ]
})
</script>

<template>
  <footer class="public-footer" :class="{ 'is-home-continuation': isHomeFooter }">
    <div class="container footer-shell">
      <section class="footer-brand" aria-label="Informacion general">
        <img
          src="/brand/logo-transparent.png"
          alt="InvitaSR"
          class="footer-logo"
          loading="lazy"
          decoding="async" />
        <p>
          Plataforma de invitaciones digitales para gestionar, personalizar y compartir eventos desde una interfaz
          simple.
        </p>
      </section>

      <div class="footer-columns">
        <nav class="footer-col" aria-label="Rutas principales">
          <p class="footer-col-title">Navegacion</p>
          <a href="/">Inicio</a>
          <a href="/planes">Planes</a>
          <a href="/noticias">Noticias</a>
        </nav>

        <nav class="footer-col" aria-label="Secciones de landing">
          <p class="footer-col-title">Secciones</p>
          <a href="/#demo-teaser">Como funciona</a>
          <a href="/#inspiracion">Beneficios</a>
          <a href="/#faq">FAQ</a>
        </nav>

        <nav class="footer-col" aria-label="Cuenta">
          <p class="footer-col-title">Cuenta</p>
          <a v-for="link in accountLinks" :key="link.label" :href="link.href">{{ link.label }}</a>
        </nav>

        <section class="footer-col" aria-label="Contacto y legal">
          <p class="footer-col-title">Informacion</p>
          <a href="mailto:hola@invitasr.com">hola@invitasr.com</a>
          <span>Lun a Vie · 9:00 a 18:00 hs</span>
          <div class="footer-legal">
            <a class="footer-legal-item" href="/privacidad">Privacidad</a>
            <a class="footer-legal-item" href="/terminos">Terminos</a>
          </div>
        </section>
      </div>

      <div class="footer-bottom">
        <span>© {{ currentYear }} InvitaSR. Todos los derechos reservados.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.public-footer {
  position: relative;
  margin-top: 0;
  padding: 10px 0 70px;
  width: 100%;
  background:
    radial-gradient(circle at 8% 4%, rgba(102, 218, 188, 0.22), transparent 28%),
    radial-gradient(circle at 94% 24%, rgba(155, 107, 255, 0.22), transparent 30%),
    linear-gradient(180deg, #faf6ff 0%, #ffffff 100%);
}

.public-footer.is-home-continuation {
  padding-top: 0;
  background: transparent;
}

.footer-shell {
  margin-top: 24px;
  display: grid;
  gap: 24px;
}

.footer-brand {
  display: flex;
  align-items: end;
  gap: 14px;
  max-width: 100%;
  margin-bottom: 24px;
  margin-left: -10px;
}

.footer-logo {
  width: clamp(126px, 18vw, 168px);
}

.footer-brand p {
  margin: 0;
  color: #605077;
  font-size: 14px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-columns {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.footer-col {
  display: grid;
  align-content: start;
  gap: 8px;
}

.footer-col-title {
  margin: 0 0 2px;
  color: #49306f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.footer-col a,
.footer-col span {
  color: #685882;
  font-size: 14px;
}

.footer-note {
  color: #85759d;
  font-size: 12px;
  line-height: 1.35;
}

.footer-col a {
  width: fit-content;
  font-weight: 600;
  transition: color 0.25s ease, transform 0.25s ease;
}

.footer-col a:hover,
.footer-legal-item:hover {
  color: #5f2ec8;
  transform: translateX(2px);
}

.footer-legal {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.footer-legal-item {
  color: #85759d;
  font-size: 13px;
  font-weight: 600;
}

.footer-bottom {
  padding-top: 16px;
  border-top: 1px solid rgba(208, 186, 242, 0.6);
  color: #7b6f95;
  font-size: 13px;
}

@media (max-width: 1010px) {
  .footer-brand {
    display: grid;
    gap: 10px;
    margin-left: 0;

  }

  .footer-brand p {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }

  .footer-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .public-footer {
    padding-top: 0;
  }

  .footer-brand {
    justify-items: center;
    text-align: center;
  }

  .footer-logo {
    margin-inline: auto;
  }

  .footer-brand p {
    text-align: center;
  }

  .footer-columns {
    gap: 16px;
    grid-template-columns: 1fr;
  }
}
</style>
