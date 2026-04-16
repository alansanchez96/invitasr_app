<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import { getPublicOnboardingProfile, type PublicOnboardingProfile } from '@/services/publicOnboarding'
import {
  getClientPlanName,
  getClientPlanStatusLabel,
  getOnboardingStatusLabel,
  getSelectedTemplateName,
  getTenantStatusLabel,
} from '@/utils/clientPanel'

const session = useSessionStore()

const profile = ref<PublicOnboardingProfile | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const stateCards = computed(() => [
  { label: 'Plan', value: getClientPlanName(session.user) },
  { label: 'Estado comercial', value: getClientPlanStatusLabel(session.user) },
  { label: 'Estado de tu cuenta', value: getTenantStatusLabel(session.user) },
  { label: 'Estilo elegido', value: getSelectedTemplateName(profile.value) },
])

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const response = await getPublicOnboardingProfile()
    profile.value = response.profile
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar el estado inicial de tu cuenta.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-stats-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Analitica inicial</p>
        <h1 id="client-stats-title">Estadisticas</h1>
        <p class="client-lead">
          Esta vista deja todo listo para tus futuras metricas. Por ahora te muestra el estado de tu cuenta y la preparacion del evento.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/invitaciones" variant="primary">Ver invitaciones</BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ajustar configuracion</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando estado de analitica...</p>

    <section class="state-grid" aria-label="Estado base de la cuenta">
      <article v-for="item in stateCards" :key="item.label" class="bo-card state-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="bo-card analytics-panel">
      <header class="section-head">
        <div>
          <h2>Panel de metricas</h2>
          <p>Las metricas de visitas, confirmaciones e interaccion apareceran aqui cuando la informacion del evento ya este conectada.</p>
        </div>
      </header>

      <div class="empty-metric-grid">
        <article class="empty-metric">
          <strong>Visitas a la invitacion</strong>
          <p>Se mostrara cuando tu invitacion este publicada y comience a recibir visitas reales.</p>
        </article>
        <article class="empty-metric">
          <strong>Confirmaciones RSVP</strong>
          <p>Se mostrara cuando tus invitados comiencen a confirmar asistencia.</p>
        </article>
        <article class="empty-metric">
          <strong>Interaccion de invitados</strong>
          <p>Te ayudara a entender como interactuan tus invitados con la galeria, el mapa y otras secciones importantes.</p>
        </article>
      </div>
    </section>

    <section class="bo-card readiness-card">
      <header class="section-head">
        <div>
          <h2>Estado de preparacion</h2>
          <p>Lo que hoy ya esta listo para mostrar metricas reales mas adelante.</p>
        </div>
      </header>

      <ul class="readiness-list">
        <li>
          <strong>Plan confirmado</strong>
          <span>{{ getClientPlanStatusLabel(session.user) }}</span>
        </li>
        <li>
          <strong>Proceso actual</strong>
          <span>{{ getOnboardingStatusLabel(profile) }}</span>
        </li>
        <li>
          <strong>Estilo elegido</strong>
          <span>{{ getSelectedTemplateName(profile) }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-page-head,
.analytics-panel,
.readiness-card,
.state-card {
  padding: 22px;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-page-head h1,
.section-head h2 {
  margin: 0;
}

.client-lead,
.section-head p,
.empty-metric p,
.client-inline-note {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.state-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.state-card {
  display: grid;
  gap: 0.45rem;
}

.state-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.state-card strong,
.empty-metric strong,
.readiness-list strong {
  color: var(--brand-ink);
}

.section-head {
  margin-bottom: 1rem;
}

.empty-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.empty-metric {
  display: grid;
  gap: 0.45rem;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff, #f9f4ff);
  border: 1px dashed rgba(155, 107, 255, 0.26);
}

.readiness-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.readiness-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(248, 243, 255, 0.88);
  border: 1px solid rgba(155, 107, 255, 0.14);
}

.readiness-list span {
  font-weight: 700;
  color: #5a308c;
  text-align: right;
}

@media (max-width: 1100px) {
  .state-grid,
  .empty-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn) {
    width: 100%;
  }

  .state-grid,
  .empty-metric-grid {
    grid-template-columns: 1fr;
  }

  .readiness-list li {
    flex-direction: column;
  }

  .readiness-list span {
    text-align: left;
  }
}
</style>
