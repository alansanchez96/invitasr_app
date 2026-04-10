<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlanAcquisitionModal from '@/components/public/PlanAcquisitionModal.vue'
import PublicPlanCatalogGrid from '@/components/public/PublicPlanCatalogGrid.vue'
import type { CatalogPlanListItem } from '@/services/catalogs'
import { useSessionStore } from '@/stores/session'
import type { PublicOnboardingRegistrationInput } from '@/services/publicOnboarding'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const isModalOpen = ref(false)
const selectedPlan = ref<CatalogPlanListItem | null>(null)
const DRAFT_KEY = 'public_onboarding_draft'

type PlanBanner = {
  key: string
  tone: 'info' | 'warning' | 'success'
  title: string
  message: string
  ctaPrimary?: string
  ctaSecondary?: string
}

const loadDraft = (): PublicOnboardingRegistrationInput | null => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicOnboardingRegistrationInput
  } catch {
    return null
  }
}

const plannerPlanQueryId = '4'
const sessionPlanBilling = computed(
  () => session.user?.client_plan?.plan?.billing_type?.toLowerCase() ?? '',
)
const selectedPlanQueryId = computed(() => {
  const raw = Array.isArray(route.query.plan) ? route.query.plan[0] : route.query.plan
  return raw ? String(raw).trim() : null
})
const reasonFromQuery = computed(() => {
  const raw = Array.isArray(route.query.reason) ? route.query.reason[0] : route.query.reason
  return String(raw ?? '').trim().toLowerCase()
})
const BANNER_DISMISS_KEY = 'plans_banner_dismissed'
const dismissedBanners = ref<Record<string, boolean>>({})

const loadDismissedBanners = () => {
  const raw = sessionStorage.getItem(BANNER_DISMISS_KEY)
  if (!raw) return
  try {
    dismissedBanners.value = JSON.parse(raw) as Record<string, boolean>
  } catch {
    dismissedBanners.value = {}
  }
}

const persistDismissedBanners = () => {
  sessionStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify(dismissedBanners.value))
}

const planBanner = computed<PlanBanner | null>(() => {
  if (session.isClient && session.hasActiveClientPlan && sessionPlanBilling.value === 'one_time') {
    return {
      key: 'client-active-one-time',
      tone: 'info',
      title: 'Tu plan actual ya esta activo',
      message:
        'Si quieres escalar tu experiencia, puedes suscribirte a Planner o comprar mas creditos desde la administracion de tu cuenta.',
      ctaPrimary: 'Ver detalle de Planner',
      ctaSecondary: 'Ir a mi cuenta',
    }
  }

  if (reasonFromQuery.value === 'plan_required') {
    return {
      key: 'reason-plan-required',
      tone: 'warning',
      title: 'Necesitas un plan activo para continuar',
      message:
        'Elige un plan para habilitar tu dashboard y gestionar tus invitaciones sin bloqueos.',
    }
  }

  if (reasonFromQuery.value === 'new_onboarding') {
    return {
      key: 'reason-new-onboarding',
      tone: 'info',
      title: 'Iniciemos una nueva compra',
      message:
        'No encontramos un onboarding pendiente. Selecciona tu plan y continuamos en segundos.',
    }
  }

  if (session.isClient && session.hasActiveClientPlan && sessionPlanBilling.value === 'subscription') {
    return {
      key: 'client-active-subscription',
      tone: 'success',
      title: 'Ya tienes una suscripcion activa',
      message:
        'Tu cuenta ya esta habilitada para operar. Puedes gestionar todo desde tu dashboard.',
      ctaSecondary: 'Ir a mi dashboard',
    }
  }

  return null
})

const visiblePlanBanner = computed(() => {
  if (!planBanner.value) return null
  return dismissedBanners.value[planBanner.value.key] ? null : planBanner.value
})

const handleBannerPrimary = () => {
  router.replace({
    query: {
      ...route.query,
      plan: plannerPlanQueryId,
    },
  })
}

const handleBannerSecondary = () => {
  if (session.isClient && session.hasActiveClientPlan) {
    router.push({ name: 'dashboard' })
    return
  }
  router.push({ name: 'configuracion' })
}

const dismissBanner = () => {
  if (!planBanner.value) return
  dismissedBanners.value = {
    ...dismissedBanners.value,
    [planBanner.value.key]: true,
  }
  persistDismissedBanners()
}

const openPlanModal = async (plan: CatalogPlanListItem) => {
  if (plan.id === undefined || plan.id === null) return
  selectedPlan.value = plan

  if (!session.isAuthenticated && !session.isHydrating) {
    await session.refreshMe()
  }

  if (session.isAuthenticated) {
    const currentDraft = loadDraft()
    const fullName = `${session.user?.name ?? ''} ${session.user?.last_name ?? ''}`.trim()
    const nextDraft: PublicOnboardingRegistrationInput = {
      plan_id: plan.id,
      template_id: null,
      register_method: currentDraft?.register_method ?? 'email',
      full_name: currentDraft?.full_name ?? fullName,
      email: currentDraft?.email ?? session.user?.email ?? '',
      password: currentDraft?.password ?? '',
      country_code: currentDraft?.country_code ?? '',
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft))
    router.push({
      name: 'public-onboarding-flow',
      query: { planId: String(plan.id), planName: plan.name },
    })
    return
  }

  isModalOpen.value = true
}

const handleRegistered = () => {
  router.push({
    name: 'public-onboarding-flow',
    query: {
      planId:
        selectedPlan.value?.id === undefined || selectedPlan.value?.id === null
          ? undefined
          : String(selectedPlan.value.id),
      planName: selectedPlan.value?.name,
    },
  })
}

loadDismissedBanners()
</script>

<template>
  <section id="planes" class="section plans">
    <div class="container">
      <h1 class="section-title">Planes InvitaSR</h1>
      <p class="section-lead">Elige tu plan y activa tu cuenta en minutos.</p>
      <article v-if="visiblePlanBanner" class="plan-banner" :class="`is-${visiblePlanBanner.tone}`" role="status">
        <div class="plan-banner-copy">
          <h2>{{ visiblePlanBanner.title }}</h2>
          <p>{{ visiblePlanBanner.message }}</p>
        </div>
        <div class="plan-banner-actions">
          <button
            type="button"
            class="banner-dismiss"
            aria-label="Cerrar mensaje"
            @click="dismissBanner">
            &times;
          </button>
          <BaseButton
            v-if="visiblePlanBanner.ctaPrimary"
            variant="primary"
            @click="handleBannerPrimary">
            {{ visiblePlanBanner.ctaPrimary }}
          </BaseButton>
          <BaseButton
            v-if="visiblePlanBanner.ctaSecondary"
            variant="ghost"
            @click="handleBannerSecondary">
            {{ visiblePlanBanner.ctaSecondary }}
          </BaseButton>
        </div>
      </article>

      <div class="plan-grid">
        <PublicPlanCatalogGrid
          primary-action-label="Obtener plan"
          :initial-detail-plan-id="selectedPlanQueryId"
          @select-plan="openPlanModal" />
      </div>
    </div>
  </section>

  <PlanAcquisitionModal
    v-model="isModalOpen"
    :plan="selectedPlan"
    @registered="handleRegistered" />
</template>

<style scoped>
.plans {
  background: #fff;
  min-height: 70vh;
}

.plan-banner {
  margin-top: 16px;
  border: 1px solid #e8dcfa;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  background: linear-gradient(140deg, #fff, #faf6ff);
}

.plan-banner h2 {
  margin: 0;
  font-size: 18px;
  color: #2f2541;
}

.plan-banner p {
  margin: 6px 0 0;
  color: #62567a;
}

.plan-banner-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.banner-dismiss {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #e6ddf8;
  background: #fff;
  color: #6843bd;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.banner-dismiss:hover {
  background: #f7f3ff;
}

.plan-banner.is-warning {
  border-color: #f8cf8d;
  background: linear-gradient(140deg, #fff9f0, #fff);
}

.plan-banner.is-success {
  border-color: #bfe9d4;
  background: linear-gradient(140deg, #f2fff8, #fff);
}

.plan-grid {
  margin-top: 32px;
}

@media (max-width: 960px) {
  .plan-banner {
    grid-template-columns: 1fr;
  }

  .plan-banner-actions {
    justify-content: flex-start;
  }
}
</style>
