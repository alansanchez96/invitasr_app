<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getFlowHealth, type FlowHealthMetric, type RecentError } from '@/services/observability'
import { notifyWarning } from '@/utils/toast'

type Kpi = {
  label: string
  value: string
  delta: string
  tone: 'up' | 'down' | 'neutral'
  footnote: string
}

type HealthMetric = {
  label: string
  value: number
  hint: string
  errors24h: number
  trendLabel: string
}

type Activity = {
  title: string
  detail: string
  time: string
}

type Shortcut = {
  label: string
  description: string
  to: string
}

const loading = ref(false)
const generatedAt = ref<string | null>(null)
const kpis = ref<Kpi[]>([])
const healthMetrics = ref<HealthMetric[]>([])
const recentActivity = ref<Activity[]>([])

const hasData = computed(() => kpis.value.length > 0 || healthMetrics.value.length > 0 || recentActivity.value.length > 0)

const formatTrend = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return { delta: '0%', tone: 'neutral' as const }
  if (value > 0) return { delta: `+${value}%`, tone: 'up' as const }
  return { delta: `${value}%`, tone: 'down' as const }
}

const formatRelative = (isoDate: string | null | undefined) => {
  if (!isoDate) return 'Sin fecha'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'

  const diffMs = Date.now() - parsed.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Hace instantes'
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `Hace ${diffDays} d`
}

const toActivity = (entry: RecentError): Activity => {
  const statusText = entry.status_code ? `HTTP ${entry.status_code}` : 'Sin codigo'
  return {
    title: `${entry.method} ${entry.url}`,
    detail: `${statusText} · ${entry.exception_class || 'Error'} · ${entry.message}`,
    time: formatRelative(entry.occurred_at),
  }
}

const toHealthMetric = (metric: FlowHealthMetric): HealthMetric => {
  const trend = formatTrend(metric.trend_percent)
  return {
    label: metric.label,
    value: metric.score,
    hint: metric.hint,
    errors24h: metric.errors_24h,
    trendLabel: trend.delta,
  }
}

const loadFlowHealth = async () => {
  loading.value = true
  try {
    const payload = await getFlowHealth()
    const overview = payload.overview ?? {}
    const errors24h = overview.errors_24h ?? 0
    const errors7d = overview.errors_7d ?? 0
    const status401 = overview.status_401_24h ?? 0
    const status403 = overview.status_403_24h ?? 0
    const status5xx = overview.status_5xx_24h ?? 0

    kpis.value = [
      {
        label: 'Errores ultimas 24h',
        value: String(errors24h),
        delta: `${errors7d} en 7 dias`,
        tone: errors24h === 0 ? 'up' : 'down',
        footnote: 'incidentes totales registrados',
      },
      {
        label: 'Respuestas 401',
        value: String(status401),
        delta: status401 === 0 ? '0 alertas' : `${status401} alertas`,
        tone: status401 === 0 ? 'up' : 'down',
        footnote: 'accesos rechazados en 24h',
      },
      {
        label: 'Respuestas 403',
        value: String(status403),
        delta: status403 === 0 ? '0 alertas' : `${status403} alertas`,
        tone: status403 === 0 ? 'up' : 'down',
        footnote: 'bloqueos por permisos en 24h',
      },
      {
        label: 'Respuestas 5xx',
        value: String(status5xx),
        delta: status5xx === 0 ? 'Sin errores server' : `${status5xx} alertas`,
        tone: status5xx === 0 ? 'up' : 'down',
        footnote: 'fallas internas en 24h',
      },
    ]

    healthMetrics.value = (payload.health ?? []).map(toHealthMetric)
    recentActivity.value = (payload.recent_errors ?? []).map(toActivity)
    generatedAt.value = payload.generated_at ?? null
  } catch {
    notifyWarning('No se pudo cargar la salud operativa del sistema.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadFlowHealth()
})

const shortcuts: Shortcut[] = [
  {
    label: 'Ver clientes',
    description: 'Gestiona altas, estados y salud general de cada cliente.',
    to: '/backoffice/clients',
  },
  {
    label: 'Revisar pagos',
    description: 'Controla transacciones recientes y suscripciones pendientes.',
    to: '/backoffice/payments',
  },
  {
    label: 'Ajustar planes',
    description: 'Actualiza precios, creditos y propuestas comerciales.',
    to: '/backoffice/plans',
  },
  {
    label: 'Mapear features',
    description: 'Asigna funcionalidades por plan para mejorar conversion.',
    to: '/backoffice/plan-features',
  },
]
</script>

<template>
  <section class="dashboard-page container" aria-labelledby="dashboard-title">
    <header class="dashboard-head">
      <div>
        <h1 id="dashboard-title">Dashboard</h1>
        <p class="dashboard-lead">Seguimiento de salud operativa para acceso, registro y cobros.</p>
      </div>
      <span class="dashboard-badge">
        {{ generatedAt ? `Actualizado ${formatRelative(generatedAt)}` : 'Sin sincronizacion reciente' }}
      </span>
    </header>

    <section v-if="loading" class="bo-card dashboard-state" aria-live="polite">
      Cargando indicadores operativos...
    </section>

    <section v-else-if="!hasData" class="bo-card dashboard-state" aria-live="polite">
      No hay datos suficientes para mostrar observabilidad en este momento.
    </section>

    <section v-else class="kpi-grid" aria-label="Indicadores principales">
      <article v-for="item in kpis" :key="item.label" class="kpi-card">
        <span class="kpi-label">{{ item.label }}</span>
        <strong class="kpi-value">{{ item.value }}</strong>
        <p class="kpi-delta" :class="item.tone">
          <span>{{ item.delta }}</span>
          <small>{{ item.footnote }}</small>
        </p>
      </article>
    </section>

    <section v-if="hasData" class="dashboard-grid" aria-label="Salud y actividad">
      <article class="bo-card panel-card">
        <header class="panel-head">
          <h2>Salud de negocio</h2>
          <span class="bo-muted">Ultimos 30 dias</span>
        </header>
        <ul class="health-list">
          <li v-for="metric in healthMetrics" :key="metric.label" class="health-item">
            <div class="health-meta">
              <strong>{{ metric.label }}</strong>
              <span>{{ metric.value }}%</span>
            </div>
            <div class="health-track" role="progressbar" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="metric.value" :aria-label="metric.label">
              <span class="health-fill" :style="{ width: `${metric.value}%` }"></span>
            </div>
            <p>{{ metric.hint }} · {{ metric.errors24h }} alertas en 24h · Tendencia {{ metric.trendLabel }}</p>
          </li>
        </ul>
      </article>

      <article class="bo-card panel-card">
        <header class="panel-head">
          <h2>Incidentes recientes</h2>
          <span class="bo-muted">Ultimas 24 horas</span>
        </header>
        <ol class="activity-list">
          <li v-for="entry in recentActivity" :key="entry.title + entry.time" class="activity-item">
            <div>
              <strong>{{ entry.title }}</strong>
              <p>{{ entry.detail }}</p>
            </div>
            <time>{{ entry.time }}</time>
          </li>
        </ol>
      </article>
    </section>

    <section class="bo-card shortcuts" aria-label="Accesos rapidos">
      <header class="panel-head">
        <h2>Acciones recomendadas</h2>
        <span class="bo-muted">Prioriza tareas de alto impacto</span>
      </header>
      <div class="shortcut-grid">
        <RouterLink v-for="shortcut in shortcuts" :key="shortcut.to" :to="shortcut.to" class="shortcut-card">
          <strong>{{ shortcut.label }}</strong>
          <p>{{ shortcut.description }}</p>
          <span>Ir al modulo</span>
        </RouterLink>
      </div>
    </section>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.dashboard-state {
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.dashboard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dashboard-head h1 {
  margin: 0;
}

.dashboard-lead {
  margin: 8px 0 0;
  color: #6b6b80;
  font-size: 14px;
}

.dashboard-badge {
  border-radius: 999px;
  border: 1px solid #e2ddf7;
  background: #fbfaff;
  color: #6b21a8;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 12px;
  white-space: nowrap;
}

.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-card);
  display: grid;
  gap: 8px;
}

.kpi-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.kpi-value {
  font-size: 28px;
  color: #1f2937;
  line-height: 1;
}

.kpi-delta {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.kpi-delta small {
  font-size: 11px;
  font-weight: 600;
  color: #6b6b80;
}

.kpi-delta.up {
  color: #0f766e;
}

.kpi-delta.down {
  color: #b91c1c;
}

.kpi-delta.neutral {
  color: #4c1d95;
}

.dashboard-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
}

.panel-card {
  display: grid;
  gap: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
}

.health-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.health-item {
  display: grid;
  gap: 8px;
}

.health-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.health-meta strong {
  color: #1f2937;
}

.health-meta span {
  color: #6b21a8;
  font-weight: 700;
}

.health-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #f1ecff;
  overflow: hidden;
}

.health-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--gradient-brand);
}

.health-item p {
  margin: 0;
  color: #6b6b80;
  font-size: 12px;
}

.activity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.activity-item {
  border: 1px solid #ece7f8;
  background: #fcfaff;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.activity-item strong {
  font-size: 13px;
  color: #1f2937;
}

.activity-item p {
  margin: 4px 0 0;
  color: #6b6b80;
  font-size: 12px;
}

.activity-item time {
  justify-self: end;
  font-size: 11px;
  color: #7c3aed;
  font-weight: 700;
}

.shortcuts {
  display: grid;
  gap: 14px;
}

.shortcut-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.shortcut-card {
  border: 1px solid #e6e8f0;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  display: grid;
  gap: 8px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.shortcut-card:hover {
  border-color: #d7c6ff;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(122, 79, 217, 0.14);
}

.shortcut-card strong {
  color: #1f2937;
  font-size: 14px;
}

.shortcut-card p {
  margin: 0;
  color: #6b6b80;
  font-size: 12px;
}

.shortcut-card span {
  font-size: 12px;
  font-weight: 700;
  color: #6b21a8;
}

.bo-muted {
  color: #6b6b80;
  font-size: 12px;
  font-weight: 600;
}

.bo-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

@media (max-width: 1010px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .shortcut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-page {
    gap: 16px;
  }

  .bo-card,
  .kpi-card {
    padding: 14px;
  }

  .shortcut-grid,
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
