<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  getTenantDashboardSummary,
  listTenantInvitations,
  type TenantInvitationItem,
} from '@/services/tenantInvitations'
import { formatStatusLabel, getClientPlanName } from '@/utils/clientPanel'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const dashboard = ref({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  credits_available: 0,
  last_updated_at: null as string | null,
})
const invitations = ref<TenantInvitationItem[]>([])
const latestStatuses = ref<string[]>([])

const publicationRate = computed(() => {
  if (dashboard.value.total_invitations <= 0) return 0
  return Math.round((dashboard.value.published_invitations / dashboard.value.total_invitations) * 100)
})

const stateCards = computed(() => [
  { label: 'Plan', value: getClientPlanName(session.user) },
  { label: 'Creditos disponibles', value: String(dashboard.value.credits_available) },
  { label: 'Total de invitaciones', value: String(dashboard.value.total_invitations) },
  { label: 'Borradores', value: String(dashboard.value.draft_invitations) },
  { label: 'Publicadas', value: String(dashboard.value.published_invitations) },
])

const publishedInvitations = computed(() =>
  invitations.value.filter((invitation) => String(invitation.status ?? '').toLowerCase() === 'published'),
)

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const isSectionEnabled = (invitation: TenantInvitationItem, sectionKey: string) => {
  const settings = asRecord(invitation.settings)
  const sectionVisibility = asRecord(settings.section_visibility)

  if (typeof sectionVisibility[sectionKey] === 'boolean') {
    return Boolean(sectionVisibility[sectionKey])
  }

  const content = asRecord(invitation.content)

  if (sectionKey === 'gallery') {
    return asArray(content.gallery).length > 0
  }
  if (sectionKey === 'faq') {
    return asArray(content.faq).length > 0
  }
  if (sectionKey === 'location') {
    return Boolean(asRecord(content.location).mapsUrl)
  }
  if (sectionKey === 'checkin') {
    return Boolean(asRecord(content.checkin).title || asRecord(content.checkin).message)
  }

  return Boolean(content[sectionKey])
}

const basicFeatureMetrics = computed(() => {
  const source = publishedInvitations.value
  const total = source.length || 1

  const countEnabled = (key: string) =>
    source.filter((invitation) => isSectionEnabled(invitation, key)).length

  const toLabel = (count: number) => `${count}/${source.length} invitaciones publicadas`

  return [
    { label: 'RSVP activo', value: toLabel(countEnabled('rsvp')), pct: Math.round((countEnabled('rsvp') / total) * 100) },
    { label: 'Galeria activa', value: toLabel(countEnabled('gallery')), pct: Math.round((countEnabled('gallery') / total) * 100) },
    { label: 'Muro activo', value: toLabel(countEnabled('wall')), pct: Math.round((countEnabled('wall') / total) * 100) },
    { label: 'Maps + Uber', value: toLabel(countEnabled('location')), pct: Math.round((countEnabled('location') / total) * 100) },
    { label: 'Cuenta regresiva', value: toLabel(countEnabled('countdown')), pct: Math.round((countEnabled('countdown') / total) * 100) },
    { label: 'Save the date', value: toLabel(countEnabled('saveDate')), pct: Math.round((countEnabled('saveDate') / total) * 100) },
  ]
})

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [summary, invitationList] = await Promise.all([
      getTenantDashboardSummary(),
      listTenantInvitations({ page: 1, perPage: 100 }),
    ])
    dashboard.value = summary
    invitations.value = invitationList.list
    latestStatuses.value = invitationList.list
      .slice(0, 5)
      .map((invitation) => formatStatusLabel(invitation.status, 'Sin estado'))
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar las estadisticas de tu cuenta.'
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
        <p class="client-kicker">Analitica real</p>
        <h1 id="client-stats-title">Estadisticas</h1>
        <p class="client-lead">
          Estas metricas se calculan con tus invitaciones reales creadas en tu cuenta.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/invitaciones" variant="primary">Ver invitaciones</BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ajustar configuracion</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando estadisticas...</p>

    <section class="state-grid" aria-label="Estado base de la cuenta">
      <article v-for="item in stateCards" :key="item.label" class="bo-card state-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="bo-card analytics-panel">
      <header class="section-head">
        <div>
          <h2>Indicadores del plan Basic</h2>
          <p>Seguimiento real de uso sobre tus invitaciones publicadas.</p>
        </div>
      </header>

      <div class="empty-metric-grid">
        <article v-for="item in basicFeatureMetrics" :key="item.label" class="empty-metric">
          <strong>{{ item.label }}</strong>
          <p>{{ item.value }}</p>
          <small>{{ item.pct }}% de adopcion</small>
        </article>

        <article class="empty-metric">
          <strong>Tasa de publicacion</strong>
          <p>{{ publicationRate }}% de tus invitaciones ya estan publicadas.</p>
        </article>
        <article class="empty-metric">
          <strong>Ultima actividad</strong>
          <p>
            {{
              dashboard.last_updated_at
                ? new Date(dashboard.last_updated_at).toLocaleString()
                : 'Aun no hay actividad registrada.'
            }}
          </p>
        </article>
        <article class="empty-metric">
          <strong>Estados recientes</strong>
          <p>{{ latestStatuses.length ? latestStatuses.join(', ') : 'Sin invitaciones recientes.' }}</p>
        </article>
      </div>
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
.empty-metric strong {
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

.empty-metric small {
  color: #7c6b96;
  font-weight: 700;
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
}
</style>
