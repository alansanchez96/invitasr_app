<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import {
  getTenantDashboardSummary,
  listTenantInvitations,
  type TenantDashboardSummary,
  type TenantInvitationItem,
} from '@/services/tenantInvitations'

const INVITATION_SELECT_RESULT_LIMIT = 25
type SearchableSelectOption = {
  value: string
  label: string
}

const isLoading = ref(false)
const isLoadingInvitations = ref(false)
const loadError = ref<string | null>(null)
const selectedInvitationIds = ref<string[]>([])
const invitationOptions = ref<TenantInvitationItem[]>([])
const invitationTitleById = ref<Record<string, string>>({})
const showInteractionLegend = ref(false)
const interactionLegendRef = ref<HTMLElement | null>(null)
const hoveredInteraction = ref<{
  label: string
  count: number
  percentage: number
  color: string
} | null>(null)
let invitationSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const createEmptyDashboard = (): TenantDashboardSummary => ({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  invitation_visits_total: 0,
  invitation_last_visit_at: null as string | null,
  invitation_last_visit: null,
  total_guests: 0,
  total_confirmed_guests: 0,
  last_confirmed_guest: null,
  credits_available: 0,
  last_updated_at: null as string | null,
  analytics: {
    basic_enabled: false,
    medium_enabled: false,
    advanced_enabled: false,
  },
  total_dj_song_requests: 0,
  total_wall_messages: 0,
  daily_activity: [],
  interaction_breakdown: [],
  invitation_performance: [],
})

const dashboard = ref<TenantDashboardSummary>(createEmptyDashboard())

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
const mediumStatsEnabled = computed(() => dashboard.value.analytics.medium_enabled)
const invitationSelectOptions = computed<SearchableSelectOption[]>(() => {
  const options = invitationOptions.value
    .filter((item) => Number(item.id ?? 0) > 0)
    .map((item) => ({
      value: String(item.id ?? ''),
      label: String(item.title ?? '').trim() || 'Invitación sin título',
    }))

  const selectedOptions = selectedInvitationIds.value
    .filter((id) => invitationTitleById.value[id] && !options.some((option) => option.value === id))
    .map((id) => ({
      value: id,
      label: String(invitationTitleById.value[id] ?? 'Invitación seleccionada'),
    }))

  options.unshift(...selectedOptions)

  return options
})

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

const proStatsCards = computed(() => [
  {
    label: 'Canciones sugeridas',
    value: formatNumber(dashboard.value.total_dj_song_requests),
    hint: 'Ideas que tus invitados dejaron para la fiesta.',
  },
  {
    label: 'Mensajes del muro',
    value: formatNumber(dashboard.value.total_wall_messages),
    hint: 'Palabras recibidas en el mural de tu invitación.',
  },
])

const summaryMetrics = computed(() => [
  { label: 'Invitaciones', value: formatNumber(dashboard.value.total_invitations) },
  { label: 'Publicadas', value: formatNumber(dashboard.value.published_invitations) },
  { label: 'Borradores', value: formatNumber(dashboard.value.draft_invitations) },
  { label: 'Créditos', value: formatNumber(dashboard.value.credits_available) },
  { label: 'Publicación', value: `${publicationRate.value}%` },
])

const dailyActivityMax = computed(() => {
  const values = dashboard.value.daily_activity.flatMap((item) => [
    item.visits,
    item.confirmed_guests,
  ])

  return Math.max(1, ...values)
})

const dailyActivityRows = computed(() =>
  dashboard.value.daily_activity.map((item) => ({
    ...item,
    visitsHeight: `${Math.round((item.visits / dailyActivityMax.value) * 100)}%`,
    confirmedHeight: `${Math.round((item.confirmed_guests / dailyActivityMax.value) * 100)}%`,
  })),
)

const totalDailyVisits = computed(() =>
  dashboard.value.daily_activity.reduce((total, item) => total + item.visits, 0),
)

const totalDailyConfirmations = computed(() =>
  dashboard.value.daily_activity.reduce((total, item) => total + item.confirmed_guests, 0),
)

const peakActivityDay = computed(() => {
  const fallback = { label: 'Sin actividad', total: 0 }

  return dashboard.value.daily_activity.reduce((best, item) => {
    const total = item.visits + item.confirmed_guests
    return total > best.total ? { label: item.label, total } : best
  }, fallback)
})

const interactionColors = ['#6f39bb', '#ef4f83', '#5e69ff', '#36d2a2', '#ff9e6e', '#8f5cff', '#2f9bd8']
const interactionPieCircumference = 2 * Math.PI * 70
const interactionTotal = computed(() =>
  dashboard.value.interaction_breakdown.reduce((total, item) => total + item.count, 0),
)
const interactionRows = computed(() =>
  dashboard.value.interaction_breakdown.map((item, index) => {
    const percentage = interactionTotal.value > 0
      ? Math.round((item.count / interactionTotal.value) * 100)
      : 0

    return {
      ...item,
      color: interactionColors[index % interactionColors.length] ?? '#6f39bb',
      percentage,
    }
  }),
)
const interactionPieSegments = computed(() => {
  if (interactionTotal.value <= 0) {
    return []
  }

  let offset = 0

  return interactionRows.value
    .filter((item) => item.count > 0)
    .map((item) => {
      const length = (item.count / interactionTotal.value) * interactionPieCircumference
      const segment = {
        ...item,
        dasharray: `${length} ${interactionPieCircumference - length}`,
        dashoffset: -offset,
      }
      offset += length

      return segment
    })
})

const performanceRows = computed(() => dashboard.value.invitation_performance)

const performanceMax = computed(() =>
  Math.max(1, ...performanceRows.value.map((item) => item.engagement_score)),
)

const performanceRowsWithWidth = computed(() =>
  performanceRows.value.map((item) => ({
    ...item,
    width: `${Math.max(4, Math.round((item.engagement_score / performanceMax.value) * 100))}%`,
  })),
)

const hasMultiplePerformanceRows = computed(() => performanceRows.value.length > 1)

const formatStatusLabel = (status: string) => {
  const value = status.trim().toLowerCase()
  if (value === 'published') return 'Publicada'
  if (value === 'draft') return 'Borrador'
  if (value === 'disabled') return 'Desactivada'
  return status || 'Sin estado'
}

const loadInvitationOptions = async (query = '') => {
  isLoadingInvitations.value = true
  try {
    const result = await listTenantInvitations({
      page: 1,
      perPage: INVITATION_SELECT_RESULT_LIMIT,
      status: 'published',
      search: query.trim() || undefined,
      orderField: 'updated_at',
      orderDirection: 'desc',
    })
    invitationOptions.value = result.list.filter((item) => Number(item.id ?? 0) > 0)
    invitationTitleById.value = {
      ...invitationTitleById.value,
      ...Object.fromEntries(invitationOptions.value.map((item) => [
        String(item.id ?? ''),
        String(item.title ?? '').trim() || 'Invitación sin título',
      ]).filter(([id]) => id !== '')),
    }
  } catch {
    invitationOptions.value = []
  } finally {
    isLoadingInvitations.value = false
  }
}

const searchInvitationOptions = (query: string) => {
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
  }

  invitationSearchDebounceTimer = setTimeout(() => {
    invitationSearchDebounceTimer = null
    void loadInvitationOptions(query)
  }, 260)
}

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    dashboard.value = await getTenantDashboardSummary({
      invitation_ids: selectedInvitationIds.value,
      published_only: true,
    })
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus estadísticas en este momento.'
  } finally {
    isLoading.value = false
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!showInteractionLegend.value) return
  const target = event.target as Node | null
  if (!target || interactionLegendRef.value?.contains(target)) return
  showInteractionLegend.value = false
}

watch(selectedInvitationIds, () => {
  void loadData()
})

onMounted(() => {
  void loadInvitationOptions()
  void loadData()
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
  }
})

onBeforeUnmount(() => {
  if (invitationSearchDebounceTimer) {
    clearTimeout(invitationSearchDebounceTimer)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }
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

    <article class="bo-card stats-filter-card" aria-label="Filtros de estadísticas">
      <label class="stats-filter-field">
        <span>Invitación</span>
        <SearchableSelect
          v-model="selectedInvitationIds"
          multiple
          :options="invitationSelectOptions"
          all-label="Todas las invitaciones"
          placeholder="Selecciona una invitación"
          search-placeholder="Buscar invitación"
          empty-label="No encontramos invitaciones."
          :result-limit="INVITATION_SELECT_RESULT_LIMIT"
          :disabled="isLoadingInvitations"
          @open="loadInvitationOptions"
          @search-change="searchInvitationOptions" />
      </label>
    </article>

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

    <template v-if="mediumStatsEnabled">
      <section class="stats-grid" aria-label="Indicadores Pro">
        <article v-for="item in proStatsCards" :key="item.label" class="bo-card stat-card stat-card--pro">
          <span class="stat-card__label">{{ item.label }}</span>
          <strong class="stat-card__value">{{ item.value }}</strong>
          <p class="stat-card__hint">{{ item.hint }}</p>
        </article>
      </section>

      <section class="medium-insights" aria-label="Estadísticas ampliadas">
        <article class="bo-card activity-card">
          <header class="chart-head">
            <div>
              <p class="client-kicker">Últimos 14 días</p>
              <h2>Actividad diaria</h2>
            </div>
            <div class="chart-legend" aria-hidden="true">
              <span><i class="legend-dot legend-dot--visits" /> Visitas</span>
              <span><i class="legend-dot legend-dot--confirmed" /> Confirmaciones</span>
            </div>
          </header>

          <div class="activity-summary">
            <span>{{ formatNumber(totalDailyVisits) }} visitas</span>
            <span>{{ formatNumber(totalDailyConfirmations) }} confirmaciones</span>
            <span>Día más activo: {{ peakActivityDay.label }}</span>
          </div>

          <div class="activity-chart" aria-label="Actividad diaria en barras verticales">
            <div v-for="item in dailyActivityRows" :key="item.date" class="activity-column">
              <span class="activity-column__date">{{ item.label }}</span>
              <div class="activity-column__bars">
                <span
                  class="activity-bar activity-bar--visits"
                  :style="{ height: item.visitsHeight }"
                  :data-tooltip="`${formatNumber(item.visits)} visitas`"
                  :title="`${formatNumber(item.visits)} visitas`" />
                <span
                  class="activity-bar activity-bar--confirmed"
                  :style="{ height: item.confirmedHeight }"
                  :data-tooltip="`${formatNumber(item.confirmed_guests)} confirmaciones`"
                  :title="`${formatNumber(item.confirmed_guests)} confirmaciones`" />
              </div>
            </div>
          </div>
        </article>

        <article class="bo-card activity-card">
          <header class="chart-head">
            <div>
              <p class="client-kicker">Interacciones</p>
              <h2>Qué usan tus invitados</h2>
            </div>
            <div ref="interactionLegendRef" class="chart-actions">
              <button
                type="button"
                class="chart-toggle"
                :class="{ 'chart-toggle--open': showInteractionLegend }"
                :aria-expanded="showInteractionLegend"
                aria-controls="interaction-legend"
                title="Ver detalle"
                @click="showInteractionLegend = !showInteractionLegend">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <Transition name="legend-slide">
                <div v-if="showInteractionLegend" id="interaction-legend" class="interaction-dropdown">
                  <div v-for="item in interactionRows" :key="item.key" class="interaction-row">
                    <div class="interaction-row__head">
                      <span><i :style="{ background: item.color }" /> {{ item.label }}</span>
                      <strong>{{ formatNumber(item.count) }}</strong>
                    </div>
                    <small>{{ item.percentage }}% del total</small>
                  </div>
                </div>
              </Transition>
            </div>
          </header>

          <div class="interaction-pie-layout" :class="{ 'interaction-pie-layout--empty': interactionTotal <= 0 }">
            <div class="interaction-pie" aria-label="Gráfico de pastel de interacciones">
              <svg class="interaction-pie__svg" viewBox="0 0 200 200" role="img">
                <circle class="interaction-pie__base" cx="100" cy="100" r="70" />
                <circle
                  v-if="interactionTotal <= 0"
                  class="interaction-pie__empty"
                  cx="100"
                  cy="100"
                  r="70" />
                <circle
                  v-for="item in interactionPieSegments"
                  :key="item.key"
                  class="interaction-pie__segment"
                  cx="100"
                  cy="100"
                  r="70"
                  :stroke="item.color"
                  :stroke-dasharray="item.dasharray"
                  :stroke-dashoffset="item.dashoffset"
                  @mouseenter="hoveredInteraction = item"
                  @mouseleave="hoveredInteraction = null" />
              </svg>
              <div class="interaction-pie__center">
                <span>{{ formatNumber(interactionTotal) }}</span>
                <small>interacciones</small>
              </div>
              <Transition name="pie-tooltip">
                <div
                  v-if="hoveredInteraction"
                  class="interaction-pie-tooltip"
                  :style="{ '--tooltip-color': hoveredInteraction.color }">
                  <strong>{{ hoveredInteraction.label }}</strong>
                  <span>{{ formatNumber(hoveredInteraction.count) }} · {{ hoveredInteraction.percentage }}%</span>
                </div>
              </Transition>
            </div>
          </div>
        </article>
      </section>

      <section class="bo-card performance-card" aria-label="Comparativa por invitación">
        <header class="chart-head">
          <div>
            <p class="client-kicker">Comparativa</p>
            <h2>{{ hasMultiplePerformanceRows ? 'Rendimiento por invitación' : 'Detalle de la invitación' }}</h2>
          </div>
          <p class="performance-card__hint">
            {{ hasMultiplePerformanceRows ? 'Ordenado por actividad total.' : 'Datos de la invitación seleccionada.' }}
          </p>
        </header>

        <div class="performance-list">
          <article v-for="item in performanceRowsWithWidth" :key="item.invitation_id" class="performance-row">
            <div class="performance-row__head">
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ formatStatusLabel(item.status) }} · Última actividad: {{ formatDateTime(item.last_activity_at, 'Sin actividad') }}</span>
              </div>
              <b>{{ formatNumber(item.engagement_score) }}</b>
            </div>
            <div class="performance-track" aria-hidden="true">
              <span :style="{ width: item.width }" />
            </div>
            <div class="performance-row__metrics">
              <span>{{ formatNumber(item.visits) }} visitas</span>
              <span>{{ formatNumber(item.confirmed_guests) }}/{{ formatNumber(item.total_guests) }} RSVP</span>
              <span>{{ item.confirmation_rate }}% confirmación</span>
              <span>{{ formatNumber(item.interactions) }} interacciones</span>
              <span>{{ formatNumber(item.dj_song_requests) }} canciones</span>
              <span>{{ formatNumber(item.wall_messages) }} mensajes</span>
            </div>
          </article>

          <p v-if="!performanceRowsWithWidth.length" class="performance-empty">
            Todavía no hay datos suficientes para comparar invitaciones.
          </p>
        </div>
      </section>
    </template>
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

.stats-filter-card {
  padding: 18px 22px;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(251, 247, 255, 0.95));
}

.stats-filter-field {
  display: grid;
  gap: 8px;
  width: min(100%, 420px);
}

.stats-filter-field > span {
  color: #241642;
  font-weight: 700;
  font-size: 0.92rem;
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

.stat-card--pro {
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(242, 87, 137, 0.12), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 242, 255, 0.96));
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

.medium-insights {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 16px;
}

.activity-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid rgba(111, 57, 187, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 247, 255, 0.96));
  overflow: visible;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  overflow: visible;
}

.chart-head h2 {
  margin: 0;
  color: #241642;
  font-size: clamp(1.2rem, 2vw, 1.55rem);
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #6a5a84;
  font-size: 0.84rem;
}

.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chart-actions {
  position: relative;
  flex: 0 0 auto;
  z-index: 5;
}

.chart-toggle {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(111, 57, 187, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #5b2d90;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(90, 57, 153, 0.1);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.chart-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(111, 57, 187, 0.34);
  background: #fff;
}

.chart-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.2s ease;
}

.chart-toggle--open svg {
  transform: rotate(180deg);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--visits {
  background: #6f39bb;
}

.legend-dot--confirmed {
  background: #ef4f83;
}

.activity-chart,
.interaction-list {
  display: grid;
  gap: 12px;
}

.activity-chart {
  min-height: 255px;
  grid-template-columns: repeat(14, minmax(34px, 1fr));
  align-items: stretch;
  gap: 10px;
  padding: 14px 10px 8px;
  border-radius: 16px;
  border: 1px solid rgba(111, 57, 187, 0.1);
  background:
    linear-gradient(180deg, rgba(111, 57, 187, 0.08) 1px, transparent 1px) 0 0 / 100% 25%,
    rgba(255, 255, 255, 0.64);
  overflow-x: auto;
}

.activity-summary,
.top-interactions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.activity-summary span,
.top-interactions article {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background: rgba(255, 255, 255, 0.78);
  padding: 9px 10px;
  color: #3d2d62;
  font-size: 0.84rem;
  font-weight: 700;
}

.top-interactions article {
  display: grid;
  gap: 2px;
}

.top-interactions article span {
  color: #6a5a84;
  font-size: 0.76rem;
}

.top-interactions article strong {
  color: #241642;
  font-size: 1.05rem;
}

.activity-column {
  min-width: 34px;
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(170px, 1fr);
  gap: 7px;
  align-items: stretch;
  justify-items: center;
}

.activity-column__date,
.interaction-row small {
  color: #6a5a84;
  font-size: 0.82rem;
}

.activity-column__date {
  min-height: 18px;
  font-weight: 700;
}

.activity-column__bars {
  width: 100%;
  height: 170px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 5px;
}

.activity-bar {
  display: block;
  width: clamp(9px, 34%, 16px);
  min-height: 4px;
  border-radius: 999px 999px 5px 5px;
  position: relative;
  transition: height 0.25s ease;
  box-shadow: 0 8px 16px rgba(90, 57, 153, 0.12);
}

.activity-bar::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translate(-50%, 4px);
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  border-radius: 999px;
  padding: 5px 8px;
  background: #241642;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(36, 22, 66, 0.22);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  z-index: 3;
}

.activity-bar:hover::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.activity-bar--visits {
  background: linear-gradient(180deg, #5e69ff, #6f39bb);
}

.activity-bar--confirmed {
  background: linear-gradient(180deg, #f0588f, #ff9e6e);
}

.interaction-pie-layout {
  display: grid;
  gap: 14px;
  justify-items: center;
  position: relative;
}

.interaction-pie {
  width: min(100%, 270px);
  aspect-ratio: 1;
  display: block;
  justify-self: center;
  text-align: center;
  position: relative;
  filter: drop-shadow(0 22px 36px rgba(90, 57, 153, 0.18));
}

.interaction-pie__svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.interaction-pie__base,
.interaction-pie__empty,
.interaction-pie__segment {
  fill: none;
  stroke-width: 42;
  transform: rotate(-90deg);
  transform-origin: 100px 100px;
}

.interaction-pie__base {
  stroke: rgba(111, 57, 187, 0.12);
}

.interaction-pie__empty {
  stroke: rgba(111, 57, 187, 0.16);
}

.interaction-pie__segment {
  cursor: default;
  transition:
    stroke-width 0.18s ease,
    filter 0.18s ease;
}

.interaction-pie__segment:hover {
  stroke-width: 47;
  filter: drop-shadow(0 0 8px rgba(36, 22, 66, 0.18));
}

.interaction-pie__center {
  position: absolute;
  inset: 31%;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(111, 57, 187, 0.12);
  display: grid;
  place-items: center;
  align-content: center;
  box-shadow: inset 0 0 0 7px rgba(247, 241, 255, 0.68);
}

.interaction-pie__center span {
  color: #241642;
  font-weight: 800;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  line-height: 1;
}

.interaction-pie__center small {
  color: #6a5a84;
  font-size: 0.76rem;
  font-weight: 700;
}

.interaction-pie-tooltip {
  --tooltip-color: #6f39bb;
  position: absolute;
  left: 50%;
  top: 6px;
  transform: translateX(-50%);
  min-width: 150px;
  max-width: 220px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: #241642;
  color: #fff;
  padding: 8px 10px 8px 12px;
  box-shadow: 0 16px 32px rgba(36, 22, 66, 0.24);
  pointer-events: none;
  text-align: left;
  z-index: 4;
}

.interaction-pie-tooltip::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: var(--tooltip-color);
}

.interaction-pie-tooltip strong,
.interaction-pie-tooltip span {
  display: block;
}

.interaction-pie-tooltip strong {
  font-size: 0.82rem;
  line-height: 1.2;
}

.interaction-pie-tooltip span {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.74rem;
  font-weight: 700;
}

.pie-tooltip-enter-active,
.pie-tooltip-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.pie-tooltip-enter-from,
.pie-tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}

.legend-slide-enter-active,
.legend-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.legend-slide-enter-from,
.legend-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.legend-slide-enter-to,
.legend-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.interaction-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(320px, calc(100vw - 48px));
  max-height: 320px;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  border-radius: 16px;
  border: 1px solid rgba(111, 57, 187, 0.14);
  background: rgba(255, 255, 255, 0.98);
  padding: 10px;
  box-shadow: 0 18px 42px rgba(54, 30, 92, 0.18);
  z-index: 20;
}

.interaction-row {
  display: grid;
  gap: 7px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(111, 57, 187, 0.11);
  background: rgba(255, 255, 255, 0.72);
  padding: 9px 10px;
}

.interaction-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #241642;
}

.interaction-row__head span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.interaction-row__head i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.performance-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid rgba(111, 57, 187, 0.14);
  background:
    radial-gradient(100% 90% at 100% 0%, rgba(94, 105, 255, 0.1), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 247, 255, 0.96));
}

.performance-card__hint {
  margin: 0;
  color: #6a5a84;
  font-size: 0.9rem;
}

.performance-list {
  display: grid;
  gap: 12px;
}

.performance-row {
  display: grid;
  gap: 10px;
  border-radius: 14px;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background: rgba(255, 255, 255, 0.82);
  padding: 14px;
}

.performance-row__head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.performance-row__head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.performance-row__head strong {
  color: #241642;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.performance-row__head span,
.performance-row__metrics,
.performance-empty {
  color: #6a5a84;
  font-size: 0.84rem;
}

.performance-row__head b {
  color: #4f2d81;
  font-size: 1.05rem;
  white-space: nowrap;
}

.performance-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(111, 57, 187, 0.14);
  overflow: hidden;
}

.performance-track span {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: linear-gradient(90deg, #5e69ff, #7e45d9 55%, #ef4f83);
}

.performance-row__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.performance-row__metrics span {
  border-radius: 999px;
  border: 1px solid rgba(111, 57, 187, 0.12);
  background: rgba(247, 241, 255, 0.72);
  padding: 5px 8px;
}

.performance-empty {
  margin: 0;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }

  .medium-insights {
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

  .stats-filter-field {
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

  .chart-head {
    flex-direction: column;
  }

  .activity-chart {
    grid-template-columns: repeat(14, minmax(32px, 1fr));
    min-height: 230px;
  }

  .activity-column__bars {
    height: 150px;
  }

  .interaction-pie-layout {
    grid-template-columns: 1fr;
  }

  .activity-summary,
  .top-interactions {
    grid-template-columns: 1fr;
  }

  .performance-row__head {
    display: grid;
  }
}
</style>
