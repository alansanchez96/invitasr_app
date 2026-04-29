<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getTenantDashboardSummary } from '@/services/tenantInvitations'
import { useSessionStore } from '@/stores/session'
import { getClientPlanName } from '@/utils/clientPanel'

const session = useSessionStore()
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const dashboard = ref({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  invitation_visits_total: 0,
  invitation_last_visit_at: null as string | null,
  total_guests: 0,
  total_confirmed_guests: 0,
  credits_available: 0,
  last_updated_at: null as string | null,
})

const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(Math.max(0, Number(value) || 0))

const formatDateTime = (value: string | null) => {
  if (!value) return 'Aun no hay visitas'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Aun no hay visitas'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const confirmationRate = computed(() => {
  if (dashboard.value.total_guests <= 0) return 0
  return Math.round((dashboard.value.total_confirmed_guests / dashboard.value.total_guests) * 100)
})

const statsCards = computed(() => [
  {
    label: 'Visitas a tu invitación',
    value: formatNumber(dashboard.value.invitation_visits_total),
    hint: 'Personas que abrieron tu invitación publicada.',
  },
  {
    label: 'Total de invitados',
    value: formatNumber(dashboard.value.total_guests),
    hint: 'Respuestas recibidas desde el formulario de asistencia.',
  },
  {
    label: 'Invitados confirmados',
    value: formatNumber(dashboard.value.total_confirmed_guests),
    hint: `${confirmationRate.value}% de confirmación sobre el total recibido.`,
  },
  {
    label: 'Última visita registrada',
    value: formatDateTime(dashboard.value.invitation_last_visit_at),
    hint: 'Se actualiza cuando alguien abre tu invitación.',
  },
])

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    dashboard.value = await getTenantDashboardSummary()
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus estadísticas en este momento.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-stats-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Resumen de rendimiento</p>
        <h1 id="client-stats-title">Estadísticas</h1>
        <p class="client-lead">
          Aquí puedes ver cómo avanza tu invitación con métricas claras y en tiempo real.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/invitaciones" variant="primary">Ver invitaciones</BaseButton>
      </div>
    </header>

    <section class="bo-card hero-stat">
      <div>
        <p class="hero-stat__kicker">Plan actual</p>
        <strong class="hero-stat__plan">{{ getClientPlanName(session.user) }}</strong>
      </div>
      <p class="hero-stat__text">
        Este panel muestra las métricas del plan Basic: visitas, invitados y actividad reciente.
      </p>
    </section>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando estadísticas...</p>

    <section class="stats-grid" aria-label="Indicadores del plan Basic">
      <article v-for="item in statsCards" :key="item.label" class="bo-card stat-card">
        <span class="stat-card__label">{{ item.label }}</span>
        <strong class="stat-card__value">{{ item.value }}</strong>
        <p class="stat-card__hint">{{ item.hint }}</p>
      </article>
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
.hero-stat,
.stat-card {
  padding: 22px;
}

.client-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-page-head h1 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.stat-card__hint,
.hero-stat__text {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hero-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background:
    radial-gradient(90% 120% at 100% 0%, rgba(214, 173, 255, 0.28), transparent 60%),
    radial-gradient(80% 100% at 0% 100%, rgba(138, 197, 255, 0.2), transparent 55%),
    #fff;
}

.hero-stat__kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.62);
  font-weight: 700;
}

.hero-stat__plan {
  display: block;
  margin-top: 0.2rem;
  font-size: clamp(1.35rem, 2.2vw, 1.8rem);
  color: #231742;
}

.hero-stat__text {
  max-width: 520px;
  text-align: right;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: grid;
  gap: 0.48rem;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(251, 247, 255, 0.95));
}

.stat-card__label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.66);
  font-weight: 700;
}

.stat-card__value {
  color: #1f1442;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  line-height: 1.2;
}

.stat-card__hint {
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .hero-stat {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stat__text {
    max-width: none;
    text-align: left;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions {
    width: 100%;
  }

  .client-actions :deep(.btn) {
    width: 100%;
  }
}
</style>

