<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import { getPublicOnboardingProfile, type PublicOnboardingProfile } from '@/services/publicOnboarding'
import { getTenantDashboardSummary, type TenantDashboardSummary } from '@/services/tenantInvitations'
import { getCreditPurchaseOptions, type CreditPurchaseOffer, type CreditPurchaseOptions } from '@/services/tenantCreditPurchases'
import {
  getClientBillingLabel,
  getClientPlanName,
  getClientPlanStatusLabel,
  getRegistrationName,
  getTenantStatusLabel,
} from '@/utils/clientPanel'
import { formatPlanName } from '@/utils/publicPlanMarketing'

const session = useSessionStore()

const profile = ref<PublicOnboardingProfile | null>(null)
const dashboard = ref<TenantDashboardSummary>({
  total_invitations: 0,
  draft_invitations: 0,
  published_invitations: 0,
  invitation_visits_total: 0,
  invitation_last_visit_at: null,
  invitation_last_visit: null,
  total_guests: 0,
  total_confirmed_guests: 0,
  last_confirmed_guest: null,
  credits_available: 0,
  last_updated_at: null,
})
const creditOptions = ref<CreditPurchaseOptions | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const customerName = computed(() => {
  const fullName = [session.user?.name, session.user?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim()

  return fullName || session.user?.email || getRegistrationName(profile.value)
})

const currentPlanName = computed(() => getClientPlanName(session.user))
const currentPlanSlug = computed(() => String(session.user?.client_plan?.plan?.name ?? '').trim().toLowerCase())
const isPlanner = computed(() => currentPlanSlug.value === 'planner')

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-AR').format(Number(value || 0))

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin actividad todavía'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const upgradeOffers = computed(() => Object.values(creditOptions.value?.upgrade_offers ?? {}))
const preferredUpgradeOffer = computed<CreditPurchaseOffer | null>(() => {
  if (!upgradeOffers.value.length) return null
  return upgradeOffers.value.find((offer) => String(offer.plan_name).toLowerCase() === 'planner')
    ?? upgradeOffers.value[0]
    ?? null
})

const heroHint = computed(() => {
  if (isPlanner.value) {
    return 'Tu cuenta ya está preparada para operar sin depender de créditos.'
  }

  if (preferredUpgradeOffer.value) {
    return `Tienes una mejora disponible a ${formatPlanName(preferredUpgradeOffer.value.plan_name)} con ${preferredUpgradeOffer.value.discount_percent}% de descuento.`
  }

  return 'Tu panel muestra lo más importante para avanzar con tus invitaciones.'
})

const mainMetrics = computed(() => [
  {
    label: 'Créditos disponibles',
    value: isPlanner.value ? 'Ilimitadas' : formatNumber(dashboard.value.credits_available),
    hint: isPlanner.value ? 'Tu plan no necesita comprar créditos.' : 'Listos para publicar nuevas invitaciones.',
    tone: 'primary',
  },
  {
    label: 'Invitaciones activas',
    value: formatNumber(dashboard.value.published_invitations),
    hint: `${formatNumber(dashboard.value.draft_invitations)} en borrador`,
    tone: 'success',
  },
  {
    label: 'Visitas recibidas',
    value: formatNumber(dashboard.value.invitation_visits_total),
    hint: `Última visita: ${formatDateTime(dashboard.value.invitation_last_visit_at)}`,
    tone: 'info',
  },
  {
    label: 'Confirmaciones',
    value: formatNumber(dashboard.value.total_confirmed_guests),
    hint: `${formatNumber(dashboard.value.total_guests)} respuestas totales`,
    tone: 'warm',
  },
])

const accountCards = computed(() => [
  {
    label: 'Plan actual',
    value: currentPlanName.value,
    hint: getClientBillingLabel(session.user),
  },
  {
    label: 'Estado del plan',
    value: getClientPlanStatusLabel(session.user),
    hint: session.hasActiveClientPlan ? 'Acceso listo para trabajar.' : 'Revisa el pago para seguir.',
  },
  {
    label: 'Estado de la cuenta',
    value: getTenantStatusLabel(session.user),
    hint: session.user?.tenant?.id ? 'Tu espacio está disponible.' : 'Estamos preparando tu espacio.',
  },
])

const lastVisitTitle = computed(() =>
  dashboard.value.invitation_last_visit?.invitation_title
    || dashboard.value.invitation_last_visit?.invitation_slug
    || 'Aún sin visitas registradas',
)

const lastGuestName = computed(() =>
  dashboard.value.last_confirmed_guest?.full_name
    || 'Aún no hay invitados confirmados',
)

const plannerSuggestionText = computed(() => {
  const offer = preferredUpgradeOffer.value
  if (!offer) return 'Cuando necesites más capacidad, podrás revisar nuevas opciones desde planes.'

  if (String(offer.plan_name).toLowerCase() === 'planner') {
    return `Sube a Planner con ${offer.discount_percent}% de descuento y trabaja con invitaciones ilimitadas.`
  }

  return `Sube a ${formatPlanName(offer.plan_name)} con ${offer.discount_percent}% de descuento y conserva tus invitaciones activas.`
})

const loadDashboard = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [profileResponse, summaryResponse, creditResponse] = await Promise.allSettled([
      getPublicOnboardingProfile(),
      getTenantDashboardSummary(),
      getCreditPurchaseOptions(),
    ])

    if (summaryResponse.status === 'rejected') {
      throw summaryResponse.reason
    }

    dashboard.value = summaryResponse.value
    profile.value = profileResponse.status === 'fulfilled' ? profileResponse.value.profile : null
    creditOptions.value = creditResponse.status === 'fulfilled' ? creditResponse.value : null
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar el resumen de tu cuenta.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <section class="client-dashboard container" aria-labelledby="client-dashboard-title">
    <header class="client-hero bo-card">
      <div class="hero-copy">
        <p class="client-kicker">Escritorio</p>
        <h1 id="client-dashboard-title">Hola, {{ customerName }}</h1>
        <p class="client-lead">{{ heroHint }}</p>

        <div class="client-actions">
          <BaseButton as="RouterLink" to="/panel/invitaciones" variant="primary">Crear o editar invitaciones</BaseButton>
          <BaseButton v-if="!isPlanner" as="RouterLink" to="/panel/mejorar-plan" variant="ghost">Ver mejoras</BaseButton>
        </div>
      </div>

      <aside class="hero-status-card" aria-label="Estado de cuenta">
        <span>Plan actual</span>
        <strong>{{ currentPlanName }}</strong>
        <small>{{ getClientPlanStatusLabel(session.user) }}</small>
      </aside>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando el resumen de tu cuenta...</p>

    <section class="metric-grid" aria-label="Métricas principales">
      <article v-for="metric in mainMetrics" :key="metric.label" class="metric-card bo-card" :class="`metric-card--${metric.tone}`">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.hint }}</p>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="bo-card activity-card">
        <header class="section-head">
          <div>
            <p class="client-kicker">Actividad reciente</p>
            <h2>Lo último que pasó</h2>
          </div>
          <BaseButton as="RouterLink" to="/panel/estadisticas" variant="ghost" class="dashboard-action-btn">
            Ver estadísticas
          </BaseButton>
        </header>

        <div class="activity-list">
          <div class="activity-item">
            <span class="activity-icon">V</span>
            <div>
              <strong>Última visita</strong>
              <p>{{ lastVisitTitle }}</p>
            </div>
            <small>{{ formatDateTime(dashboard.invitation_last_visit?.visited_at ?? dashboard.invitation_last_visit_at) }}</small>
          </div>

          <div class="activity-item">
            <span class="activity-icon">OK</span>
            <div>
              <strong>Último invitado confirmado</strong>
              <p>{{ lastGuestName }}</p>
            </div>
            <small>{{ formatDateTime(dashboard.last_confirmed_guest?.confirmed_at) }}</small>
          </div>
        </div>
      </article>

      <article class="bo-card account-card">
        <header class="section-head">
          <div>
            <p class="client-kicker">Cuenta</p>
            <h2>Estado de tu acceso</h2>
          </div>
        </header>

        <ul class="account-list">
          <li v-for="item in accountCards" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.hint }}</p>
          </li>
        </ul>
      </article>

      <article v-if="!isPlanner" class="bo-card upgrade-suggestion">
        <div>
          <p class="client-kicker">Sugerencia</p>
          <h2>Crece sin frenar tus invitaciones</h2>
          <p>{{ plannerSuggestionText }}</p>
        </div>

        <BaseButton as="RouterLink" to="/panel/mejorar-plan" variant="primary" class="dashboard-action-btn">
          Mejorar plan
        </BaseButton>
      </article>

      <article class="bo-card quick-card">
        <p class="client-kicker">Accesos rápidos</p>
        <div class="quick-grid">
          <RouterLink to="/panel/invitaciones">Mis invitaciones</RouterLink>
          <RouterLink to="/panel/invitados">Lista de invitados</RouterLink>
          <RouterLink to="/panel/pagos">Mis pagos</RouterLink>
          <RouterLink to="/panel/notificaciones">Notificaciones</RouterLink>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.client-dashboard {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
}

.client-hero,
.metric-card,
.activity-card,
.account-card,
.upgrade-suggestion,
.quick-card {
  padding: 22px;
}

.client-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 320px);
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 6% 8%, rgba(255, 255, 255, 0.94), transparent 30%),
    radial-gradient(circle at 100% 0%, rgba(45, 212, 191, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(248, 243, 255, 0.98), rgba(238, 246, 255, 0.92));
  border: 1px solid rgba(128, 80, 210, 0.18);
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 0.7rem;
}

.client-kicker {
  margin: 0 0 0.35rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.68);
  font-weight: 800;
}

.client-hero h1,
.section-head h2,
.upgrade-suggestion h2 {
  margin: 0;
  color: #211239;
}

.client-lead,
.client-inline-note,
.metric-card p,
.activity-item p,
.account-list p,
.upgrade-suggestion p {
  margin: 0;
  color: #6a5a84;
  line-height: 1.5;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.3rem;
}

.hero-status-card {
  display: grid;
  align-content: center;
  gap: 7px;
  min-height: 160px;
  padding: 20px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(135, 93, 216, 0.2);
  box-shadow: 0 18px 45px rgba(73, 49, 112, 0.12);
}

.hero-status-card span,
.hero-status-card small {
  color: #74628c;
  font-weight: 800;
}

.hero-status-card strong {
  color: #211239;
  font-size: clamp(1.55rem, 4vw, 2.35rem);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  display: grid;
  gap: 0.45rem;
  overflow: hidden;
  border: 1px solid rgba(155, 107, 255, 0.16);
}

.metric-card span,
.account-list span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 800;
}

.metric-card strong {
  color: #211239;
  font-size: clamp(1.45rem, 3.6vw, 2.25rem);
}

.metric-card--primary {
  background: linear-gradient(145deg, #fff, #f7f0ff);
}

.metric-card--success {
  background: linear-gradient(145deg, #fff, #effdf9);
}

.metric-card--info {
  background: linear-gradient(145deg, #fff, #edf7ff);
}

.metric-card--warm {
  background: linear-gradient(145deg, #fff, #fff7ed);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 18px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 1rem;
}

.activity-list,
.account-list {
  display: grid;
  gap: 12px;
}

.activity-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border-radius: 18px;
  border: 1px solid rgba(155, 107, 255, 0.14);
  background: rgba(255, 255, 255, 0.78);
}

.activity-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f4edff;
}

.activity-item strong,
.account-list strong {
  color: #211239;
}

.activity-item small {
  color: #6a5a84;
  font-weight: 700;
  text-align: right;
}

.account-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.account-list li {
  display: grid;
  gap: 0.25rem;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(155, 107, 255, 0.14);
  background: rgba(248, 243, 255, 0.78);
}

.upgrade-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  grid-column: 1 / -1;
  background:
    radial-gradient(circle at 100% 0%, rgba(236, 72, 153, 0.16), transparent 32%),
    linear-gradient(135deg, #fff, #f8f2ff);
  border: 1px solid rgba(155, 107, 255, 0.2);
}

.quick-card {
  grid-column: 1 / -1;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-grid a {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(155, 107, 255, 0.16);
  background: rgba(255, 255, 255, 0.78);
  color: #4f2d81;
  font-weight: 800;
  text-align: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.quick-grid a:hover,
.quick-grid a:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px rgba(58, 33, 111, 0.12);
}

.dashboard-action-btn {
  min-height: 42px;
  border-radius: 12px;
  white-space: nowrap;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .metric-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-hero {
    grid-template-columns: 1fr;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .upgrade-suggestion :deep(.btn) {
    width: 100%;
  }

  .metric-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .section-head,
  .upgrade-suggestion {
    flex-direction: column;
    align-items: flex-start;
  }

  .activity-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .activity-item small {
    grid-column: 2;
    text-align: left;
  }
}
</style>
