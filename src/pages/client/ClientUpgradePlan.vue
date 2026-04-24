<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import type { CatalogPlanFeatureItem, CatalogPlanListItem } from '@/services/catalogs'
import {
  buildTopPlanHighlights,
  formatPlanName,
  formatPlanPrice,
  resolvePlanNarrative,
} from '@/utils/publicPlanMarketing'

const session = useSessionStore()
const catalogStore = useCatalogStore()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const currentPlan = ref<CatalogPlanListItem | null>(null)
const targetPlan = ref<CatalogPlanListItem | null>(null)
const currentPlanFeatures = ref<CatalogPlanFeatureItem[]>([])
const targetPlanFeatures = ref<CatalogPlanFeatureItem[]>([])

const planSlug = (name?: string | null) => String(name ?? '').trim().toLowerCase()

const targetIntro = computed(() => {
  if (!currentPlan.value || !targetPlan.value) return 'Te mostramos el siguiente plan recomendado para crecer.'
  return `Hoy tienes ${formatPlanName(currentPlan.value.name)} y puedes subir a ${formatPlanName(targetPlan.value.name)}.`
})

const targetFeatureHighlights = computed(() => {
  const currentFeatureKeys = new Set(
    currentPlanFeatures.value
      .map((feature) => String(feature.key ?? '').trim())
      .filter(Boolean),
  )

  const targetExclusive = targetPlanFeatures.value.filter((feature) => {
    const key = String(feature.key ?? '').trim()
    if (!key) return false
    return !currentFeatureKeys.has(key)
  })

  if (targetExclusive.length) {
    return buildTopPlanHighlights(targetExclusive, 8)
  }

  return buildTopPlanHighlights(targetPlanFeatures.value, 8)
})

const currentFeatureHighlights = computed(() => buildTopPlanHighlights(currentPlanFeatures.value, 4))

const canUpgrade = computed(() => {
  if (!currentPlan.value || !targetPlan.value) return false
  return planSlug(currentPlan.value.name) !== planSlug(targetPlan.value.name)
})

const currentPlanNarrative = computed(() => {
  if (!currentPlan.value) return 'Este es tu plan activo actualmente.'
  return resolvePlanNarrative(currentPlan.value)
})

const targetPlanNarrative = computed(() => {
  if (!targetPlan.value) return 'No encontramos un plan superior para mostrar.'
  return resolvePlanNarrative(targetPlan.value)
})

const resolveCurrentPlan = (plans: CatalogPlanListItem[]) => {
  const sessionPlanId = session.user?.client_plan?.plan?.id
  if (sessionPlanId) {
    const byId = plans.find((plan) => String(plan.id) === String(sessionPlanId))
    if (byId) return byId
  }

  const sessionPlanName = session.user?.client_plan?.plan?.name
  if (sessionPlanName) {
    const byName = plans.find((plan) => planSlug(plan.name) === planSlug(sessionPlanName))
    if (byName) return byName
  }

  return plans.find((plan) => planSlug(plan.name) === 'basic') ?? plans[0] ?? null
}

const resolveTargetPlan = (plans: CatalogPlanListItem[], current: CatalogPlanListItem | null) => {
  if (!current) return plans.find((plan) => planSlug(plan.name) === 'pro') ?? plans[0] ?? null

  const currentSlug = planSlug(current.name)
  if (currentSlug === 'basic') {
    return plans.find((plan) => planSlug(plan.name) === 'pro') ?? current
  }
  if (currentSlug === 'pro') {
    return plans.find((plan) => planSlug(plan.name) === 'planner') ?? current
  }
  if (currentSlug === 'planner') {
    return plans.find((plan) => planSlug(plan.name) === 'premium') ?? current
  }

  const sorted = [...plans].sort((left, right) => Number(left.price_usd ?? 0) - Number(right.price_usd ?? 0))
  const currentPrice = Number(current.price_usd ?? 0)
  return sorted.find((plan) => Number(plan.price_usd ?? 0) > currentPrice) ?? current
}

const loadData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const plans = await catalogStore.ensurePlans()
    const activePlans = plans.filter((plan) => String(plan.status ?? 'active').toLowerCase() === 'active')
    const resolvedCurrentPlan = resolveCurrentPlan(activePlans)
    const resolvedTargetPlan = resolveTargetPlan(activePlans, resolvedCurrentPlan)

    currentPlan.value = resolvedCurrentPlan
    targetPlan.value = resolvedTargetPlan

    const [currentFeatures, nextFeatures] = await Promise.all([
      resolvedCurrentPlan?.id ? catalogStore.ensurePlanFeatures(resolvedCurrentPlan.id) : Promise.resolve([]),
      resolvedTargetPlan?.id ? catalogStore.ensurePlanFeatures(resolvedTargetPlan.id) : Promise.resolve([]),
    ])

    currentPlanFeatures.value = currentFeatures
    targetPlanFeatures.value = nextFeatures
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar la comparación de planes.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-upgrade-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Escala tu experiencia</p>
        <h1 id="client-upgrade-title">Mejorar plan</h1>
        <p class="client-lead">{{ targetIntro }}</p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel" variant="ghost">Volver al panel</BaseButton>
        <BaseButton as="RouterLink" to="/planes?intent=upgrade" variant="primary">
          Ver planes y actualizar
        </BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando planes...</p>

    <section v-else class="upgrade-grid">
      <article class="bo-card upgrade-card">
        <p class="card-kicker">Plan actual</p>
        <h2>{{ formatPlanName(currentPlan?.name) }}</h2>
        <p class="plan-price">{{ formatPlanPrice(currentPlan?.price_usd, currentPlan?.billing_type) }}</p>
        <p class="plan-copy">{{ currentPlanNarrative }}</p>

        <ul class="feature-list">
          <li v-for="item in currentFeatureHighlights" :key="`current-${item.key}`">
            <strong>{{ item.title }}</strong>
            <span>{{ item.summary }}</span>
          </li>
        </ul>
      </article>

      <article class="bo-card upgrade-card upgrade-card--target">
        <p class="card-kicker">Siguiente nivel</p>
        <h2>{{ formatPlanName(targetPlan?.name) }}</h2>
        <p class="plan-price">{{ formatPlanPrice(targetPlan?.price_usd, targetPlan?.billing_type) }}</p>
        <p class="plan-copy">{{ targetPlanNarrative }}</p>

        <ul class="feature-list">
          <li v-for="item in targetFeatureHighlights" :key="`target-${item.key}`">
            <strong>{{ item.title }}</strong>
            <span>{{ item.summary }}</span>
            <em>{{ item.badge }}</em>
          </li>
        </ul>

        <div class="upgrade-cta">
          <BaseButton
            as="RouterLink"
            to="/planes?intent=upgrade"
            variant="primary"
            :disabled="!canUpgrade">
            {{ canUpgrade ? `Subir a ${formatPlanName(targetPlan?.name)}` : 'Ya tienes el plan más alto disponible' }}
          </BaseButton>
        </div>
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
.upgrade-card {
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
.upgrade-card h2 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.plan-copy {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.upgrade-card {
  display: grid;
  align-content: start;
  gap: 0.75rem;
}

.upgrade-card--target {
  border: 1px solid rgba(123, 78, 224, 0.3);
  background:
    radial-gradient(circle at top right, rgba(184, 141, 255, 0.2), transparent 45%),
    linear-gradient(180deg, #ffffff 0%, #f8f2ff 100%);
}

.card-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.plan-price {
  margin: 0;
  color: var(--brand-ink);
  font-weight: 800;
}

.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.feature-list li {
  border: 1px solid rgba(155, 107, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px 12px;
  display: grid;
  gap: 0.25rem;
}

.feature-list strong {
  color: var(--brand-ink);
}

.feature-list span {
  color: #6a5a84;
  font-size: 0.92rem;
}

.feature-list em {
  justify-self: start;
  margin-top: 2px;
  font-style: normal;
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.14rem 0.5rem;
  color: #4c1d95;
  background: rgba(196, 181, 253, 0.45);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.upgrade-cta {
  margin-top: 4px;
}

@media (max-width: 980px) {
  .upgrade-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .upgrade-cta :deep(.btn) {
    width: 100%;
  }
}
</style>
