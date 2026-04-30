<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const displayName = computed(() => {
  const fullName = [session.user?.name, session.user?.last_name].filter(Boolean).join(' ').trim()

  return fullName || session.user?.email || 'tu cuenta'
})

const handleLogout = async () => {
  await session.logout()
}
</script>

<template>
  <section class="inactive-client-page" aria-labelledby="inactive-client-title">
    <div class="inactive-card">
      <div class="inactive-orb" aria-hidden="true">
        <span>!</span>
      </div>

      <p class="inactive-kicker">Acceso no disponible</p>
      <h1 id="inactive-client-title">Tu cuenta está suspendida</h1>
      <p class="inactive-lead">
        {{ displayName }}, el administrador desactivó el acceso a esta cuenta. Si crees que se trata de un error o
        necesitas recuperar el acceso, ponte en contacto con el equipo de soporte.
      </p>

      <div class="inactive-note">
        <strong>Qué puedes hacer ahora</strong>
        <p>Escríbenos con el email de tu cuenta para revisar el caso y ayudarte con los próximos pasos.</p>
      </div>

      <div class="inactive-actions">
        <BaseButton as="a" href="mailto:soporte@invitasr.com" variant="primary">
          Contactar soporte
        </BaseButton>
        <BaseButton as="RouterLink" to="/" variant="ghost">
          Volver al inicio
        </BaseButton>
        <BaseButton v-if="session.isAuthenticated" type="button" variant="ghost" @click="handleLogout">
          Cerrar sesión
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.inactive-client-page {
  min-height: calc(100vh - 84px);
  display: grid;
  place-items: center;
  padding: clamp(32px, 8vw, 96px) 18px;
  background:
    radial-gradient(circle at 15% 12%, rgba(155, 107, 255, 0.2), transparent 28%),
    radial-gradient(circle at 86% 20%, rgba(240, 106, 166, 0.18), transparent 30%),
    linear-gradient(180deg, #f9f5ff 0%, #fff8fb 100%);
}

.inactive-card {
  width: min(100%, 720px);
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 28px 78px rgba(74, 42, 123, 0.18);
  padding: clamp(28px, 6vw, 54px);
}

.inactive-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(122, 79, 217, 0.08), transparent 42%),
    radial-gradient(circle at 92% 14%, rgba(240, 106, 166, 0.16), transparent 24%);
}

.inactive-card > * {
  position: relative;
}

.inactive-orb {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: #fff;
  font-weight: 900;
  font-size: 1.4rem;
  background: linear-gradient(135deg, #7a4fd9, #f06aa6);
  box-shadow: 0 16px 34px rgba(122, 79, 217, 0.28);
  margin-bottom: 22px;
}

.inactive-kicker {
  margin: 0 0 0.55rem;
  color: #7a4fd9;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #211236;
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.inactive-lead {
  max-width: 58ch;
  margin: 18px 0 0;
  color: #665277;
  font-size: 1.02rem;
  line-height: 1.75;
}

.inactive-note {
  margin-top: 24px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(122, 79, 217, 0.16);
  background: rgba(250, 246, 255, 0.92);
}

.inactive-note strong {
  color: #2a1740;
}

.inactive-note p {
  margin: 6px 0 0;
  color: #6c5a7f;
  line-height: 1.6;
}

.inactive-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

@media (max-width: 640px) {
  .inactive-actions,
  .inactive-actions :deep(.btn) {
    width: 100%;
  }
}
</style>
