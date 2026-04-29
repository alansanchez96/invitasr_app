<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getTenantDashboardSummary } from '@/services/tenantInvitations'

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

const formatDateTime = (value: string | null, fallback = 'Sin datos') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

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

const publicationRate = computed(() => {
  if (dashboard.value.total_invitations <= 0) return 0
  return Math.round((dashboard.value.published_invitations / dashboard.value.total_invitations) * 100)
})

const confirmationRateClamped = computed(() => Math.min(100, Math.max(0, confirmationRate.value)))
const publicationRateClamped = computed(() => Math.min(100, Math.max(0, publicationRate.value)))
const isConfirmationComplete = computed(() => confirmationRateClamped.value >= 100)

const confirmationRateStyle = computed<Record<string, string>>(() => ({
  '--pct': `${confirmationRateClamped.value}%`,
}))

const lastUpdatedLabel = computed(() =>
  formatDateTime(dashboard.value.last_updated_at, 'Sin movimientos'),
)

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
    value: formatDateTime(dashboard.value.invitation_last_visit_at, 'Aún no hay visitas'),
    hint: 'Se actualiza cuando alguien abre tu invitación.',
  },
])

const summaryMetrics = computed(() => [
  { label: 'Invitaciones', value: formatNumber(dashboard.value.total_invitations) },
  { label: 'Publicadas', value: formatNumber(dashboard.value.published_invitations) },
  { label: 'Borradores', value: formatNumber(dashboard.value.draft_invitations) },
  { label: 'Créditos', value: formatNumber(dashboard.value.credits_available) },
  { label: 'Publicación', value: `${publicationRate.value}%` },
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

    <section class="bo-card hero-stat" aria-label="Resumen rápido">
      <div class="hero-stat__copy">
        <p class="hero-stat__title">Tus números clave, claros y accionables.</p>
        <p class="hero-stat__subtitle">
          Revisa el rendimiento de tu invitación y toma decisiones en minutos.
        </p>
      </div>

      <div class="hero-stat__metrics">
        <article v-for="item in summaryMetrics" :key="item.label" class="hero-stat__metric">
          <span class="hero-stat__metric-label">{{ item.label }}</span>
          <strong class="hero-stat__metric-value">{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section class="insights-grid" aria-label="Insights rápidos">
      <article class="bo-card insight-card insight-card--confirmation">
        <div class="insight-card__head">
          <p class="insight-card__kicker">Confirmación RSVP</p>
          <strong>{{ formatNumber(dashboard.total_confirmed_guests) }} / {{ formatNumber(dashboard.total_guests) }}</strong>
        </div>
        <div class="insight-card__body">
          <div
            class="insight-ring"
            :class="{ 'insight-ring--complete': isConfirmationComplete }"
            :style="confirmationRateStyle">
            <div class="insight-ring__inner">
              <strong>{{ confirmationRateClamped }}%</strong>
              <span>{{ isConfirmationComplete ? 'completo' : 'confirmación' }}</span>
            </div>
          </div>
          <p class="insight-card__note">
            {{ formatNumber(dashboard.total_confirmed_guests) }} invitados ya confirmaron su asistencia.
          </p>
        </div>
      </article>

      <article class="bo-card insight-card insight-card--publication">
        <div class="insight-card__head">
          <p class="insight-card__kicker">Ritmo de publicación</p>
          <strong>{{ publicationRateClamped }}%</strong>
        </div>
        <div class="insight-progress" role="presentation" aria-hidden="true">
          <span :style="{ width: `${publicationRateClamped}%` }" />
        </div>
        <p class="insight-card__note">
          Último movimiento: {{ lastUpdatedLabel }}
        </p>
      </article>
    </section>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando estadísticas...</p>

    <section class="stats-grid" aria-label="Indicadores principales">
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
.insight-card,
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
.stat-card__hint {
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
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background:
    radial-gradient(90% 120% at 100% 0%, rgba(214, 173, 255, 0.28), transparent 60%),
    radial-gradient(80% 100% at 0% 100%, rgba(138, 197, 255, 0.2), transparent 55%),
    #fff;
}

.hero-stat__copy {
  display: grid;
  gap: 6px;
  min-width: 280px;
}

.hero-stat__title {
  margin: 0;
  color: #2b1b53;
  font-weight: 700;
  font-size: 1.08rem;
  line-height: 1.2;
}

.hero-stat__subtitle {
  margin: 0;
  color: #6f5f8e;
  font-size: 0.92rem;
}

.hero-stat__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  flex: 1 1 auto;
}

.hero-stat__metric {
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(111, 57, 187, 0.14);
  background: rgba(255, 255, 255, 0.9);
  display: grid;
  gap: 2px;
  box-shadow: 0 10px 22px rgba(91, 57, 153, 0.08);
}

.hero-stat__metric-label {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.62);
  font-weight: 700;
}

.hero-stat__metric-value {
  color: #231742;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.15;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.insight-card {
  border: 1px solid rgba(111, 57, 187, 0.14);
  background:
    radial-gradient(110% 110% at 0% 0%, rgba(180, 223, 255, 0.2), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(251, 247, 255, 0.96));
  display: grid;
  gap: 12px;
}

.insight-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.insight-card__head strong {
  font-size: clamp(1.2rem, 1.8vw, 1.5rem);
  color: #1d103e;
}

.insight-card__kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.62);
  font-weight: 700;
}

.insight-card__body {
  display: flex;
  gap: 16px;
  align-items: center;
}

.insight-ring {
  --pct: 0%;
  width: 128px;
  aspect-ratio: 1;
  border-radius: 999px;
  background:
    conic-gradient(from -90deg, #6f39bb var(--pct), rgba(111, 57, 187, 0.16) var(--pct)),
    radial-gradient(closest-side, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  position: relative;
  box-shadow: 0 12px 30px rgba(90, 57, 153, 0.16);
}

.insight-ring::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  border: 1px solid rgba(111, 57, 187, 0.18);
  pointer-events: none;
}

.insight-ring--complete {
  background:
    conic-gradient(from -90deg, #36d2a2 0%, #5f6dff 35%, #8f5cff 68%, #f0588f 100%),
    radial-gradient(closest-side, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0));
  animation: completePulse 2.2s ease-in-out infinite;
}

.insight-ring--complete::after {
  border-color: rgba(79, 214, 171, 0.55);
  box-shadow:
    0 0 0 4px rgba(79, 214, 171, 0.12),
    0 0 0 10px rgba(111, 95, 255, 0.08);
}

.insight-ring__inner {
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  border-radius: inherit;
  background: #fff;
  border: 1px solid rgba(111, 57, 187, 0.15);
  display: grid;
  place-items: center;
  text-align: center;
  padding: 10px;
}

.insight-ring__inner strong {
  color: #1f1442;
  font-size: 1.3rem;
  line-height: 1;
}

.insight-ring__inner span {
  color: #6b5a87;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@keyframes completePulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.025);
  }

  100% {
    transform: scale(1);
  }
}

.insight-progress {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(111, 57, 187, 0.16);
  overflow: hidden;
}

.insight-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #5e69ff, #7e45d9 55%, #ef4f83);
  transition: width 0.3s ease;
}

.insight-card__note {
  margin: 0;
  color: #64557f;
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

  .insights-grid {
    grid-template-columns: 1fr;
  }

  .hero-stat {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stat__copy {
    min-width: 0;
  }

  .hero-stat__metrics {
    width: 100%;
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

  .hero-stat__metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: visible;
  }

  .insight-card__body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
