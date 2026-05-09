<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getCatalogPlanComparison,
  listCatalogPlanFeatures,
  listCatalogPlans,
  type CatalogPlanComparisonGroup,
  type CatalogPlanComparisonItem,
  type CatalogPlanComparisonPlan,
  type CatalogPlanComparisonValue,
  type CatalogPlanFeatureItem,
  type CatalogPlanListItem,
} from '@/services/catalogs'
import {
  formatBillingLabel,
  formatPlanName,
  formatPlanPrice,
  resolvePlanMeta,
  resolvePlanNarrative,
  selectCommercialPlans,
  sortMarketingFeatures,
  type MarketingFeature,
} from '@/utils/publicPlanMarketing'
import { useSessionStore } from '@/stores/session'
import { notifyWarning } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const PlanAcquisitionModal = defineAsyncComponent(() => import('@/components/public/PlanAcquisitionModal.vue'))

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const plans = ref<CatalogPlanListItem[]>([])
const comparisonPlans = ref<CatalogPlanComparisonPlan[]>([])
const comparisonGroups = ref<CatalogPlanComparisonGroup[]>([])
const featureCache = ref<Record<string, CatalogPlanFeatureItem[]>>({})
const selectedPlan = ref<CatalogPlanListItem | null>(null)
const isAcquisitionModalOpen = ref(false)

const planOrder: Record<string, number> = {
  basic: 1,
  pro: 2,
  planner: 3,
}

const getPlanId = (plan: CatalogPlanListItem) => {
  const raw = plan.id
  return raw === undefined || raw === null ? '' : String(raw)
}

const getPlanNameKey = (plan: CatalogPlanListItem) =>
  String(plan.name ?? '').trim().toLowerCase()

const visiblePlans = computed(() =>
  [...selectCommercialPlans(plans.value)].sort((left, right) => {
    const leftOrder = planOrder[getPlanNameKey(left)] ?? 99
    const rightOrder = planOrder[getPlanNameKey(right)] ?? 99
    return leftOrder - rightOrder
  }),
)

const preferredPlanKey = computed(() =>
  String(route.query.plan ?? '').trim().toLowerCase(),
)

const getPlanFeatures = (plan: CatalogPlanListItem) => {
  const planId = getPlanId(plan)
  return featureCache.value[planId] ?? plan.features ?? []
}

const getDetailFeatures = (plan: CatalogPlanListItem): MarketingFeature[] =>
  sortMarketingFeatures(getPlanFeatures(plan)).slice(0, 14)

const getComparisonValue = (
  plan: CatalogPlanComparisonPlan,
  item: CatalogPlanComparisonItem,
): CatalogPlanComparisonValue => {
  const planKey = String(plan.name ?? '').trim().toLowerCase()
  return item.values[planKey] ?? { included: false, display_value: null, raw_limit: null }
}

const isComparisonStatus = (value: CatalogPlanComparisonValue) => !value.display_value

const getComparisonLabel = (value: CatalogPlanComparisonValue) =>
  value.included ? value.display_value || 'Incluido' : 'No incluido'

const getComparisonIcon = (value: CatalogPlanComparisonValue) =>
  value.included ? '' : 'X'

const getDemoTo = (plan: CatalogPlanListItem) => ({
  name: 'demo',
  query: {
    plan: getPlanNameKey(plan) || undefined,
  },
})

const getPlanCardClass = (plan: CatalogPlanListItem) => ({
  'is-pro': getPlanNameKey(plan) === 'pro',
  'is-preferred': preferredPlanKey.value === getPlanNameKey(plan),
})

const handleSelectPlan = (plan: CatalogPlanListItem) => {
  if (session.isMaster) {
    notifyWarning('Esta compra se realiza desde una cuenta cliente.')
    return
  }

  if (!session.isAuthenticated) {
    selectedPlan.value = plan
    isAcquisitionModalOpen.value = true
    return
  }

  router.push({
    name: 'public-onboarding-flow',
    query: {
      planId: plan.id,
      planName: plan.name,
    },
  })
}

const handleRegisteredPlan = () => {
  const plan = selectedPlan.value
  isAcquisitionModalOpen.value = false
  if (!plan) return

  router.push({
    name: 'public-onboarding-flow',
    query: {
      planId: plan.id,
      planName: plan.name,
    },
  })
}

const loadPlans = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const [response, comparison] = await Promise.all([
      listCatalogPlans({ page: 1, perPage: 10 }),
      getCatalogPlanComparison(),
    ])
    const commercialPlans = selectCommercialPlans(response.list)
    const details = await Promise.all(
      commercialPlans.map(async (plan) => {
        const planId = getPlanId(plan)
        if (!planId) return [planId, plan.features] as const

        try {
          const features = await listCatalogPlanFeatures(planId, { perPage: 100 })
          return [planId, features.length ? features : plan.features] as const
        } catch {
          return [planId, plan.features] as const
        }
      }),
    )

    plans.value = commercialPlans
    comparisonPlans.value = comparison.plans
    comparisonGroups.value = comparison.groups
    featureCache.value = Object.fromEntries(details.filter(([planId]) => Boolean(planId)))
  } catch {
    loadError.value = 'No pudimos cargar los planes en este momento.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPlans)
</script>

<template>
  <main class="plans-page">
    <section class="plans-hero" aria-labelledby="plans-title">
      <div class="container plans-hero-shell">
        <div class="plans-hero-copy">
          <p class="plans-kicker">Comparar planes</p>
          <h1 id="plans-title">Elige con claridad antes de crear tu invitación</h1>
          <p>
            Compara límites, beneficios y experiencia de cada opción. Si quieres probar antes,
            puedes abrir una demo filtrada por el plan que estás mirando.
          </p>
        </div>
        <div class="plans-hero-card" aria-label="Sugerencia de elección">
          <span>Ruta recomendada</span>
          <strong>Prueba una plantilla, compara y luego obtén el plan que encaje mejor.</strong>
          <RouterLink :to="{ name: 'demo' }">Explorar plantillas</RouterLink>
        </div>
      </div>
    </section>

    <section class="plans-content" aria-label="Opciones disponibles">
      <div class="container plans-shell">
        <div v-if="isLoading" class="plans-state" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <p>Cargando opciones disponibles...</p>
        </div>

        <div v-else-if="loadError" class="plans-state plans-state-error" role="alert">
          <p>{{ loadError }}</p>
        </div>

        <template v-else>
          <div class="plan-summary-grid">
            <article
              v-for="plan in visiblePlans"
              :key="String(plan.id ?? plan.name)"
              class="plan-summary-card"
              :class="getPlanCardClass(plan)">
              <div class="plan-summary-top">
                <span>{{ formatBillingLabel(plan.billing_type) }}</span>
                <strong v-if="getPlanNameKey(plan) === 'pro'">Equilibrio ideal</strong>
                <strong v-else-if="getPlanNameKey(plan) === 'planner'">Para explorar</strong>
              </div>
              <h2>{{ formatPlanName(plan.name) }}</h2>
              <p>{{ resolvePlanNarrative(plan) }}</p>
              <div class="plan-price">
                <strong>{{ formatPlanPrice(plan.price_usd, plan.billing_type) }}</strong>
                <span v-if="resolvePlanMeta(plan)">{{ resolvePlanMeta(plan) }}</span>
              </div>
              <div class="plan-summary-actions">
                <BaseButton variant="primary" @click="handleSelectPlan(plan)">Obtener plan</BaseButton>
                <RouterLink :to="getDemoTo(plan)">Probar</RouterLink>
              </div>
            </article>
          </div>

          <section class="comparison-panel" aria-labelledby="comparison-title">
            <div class="comparison-head">
              <div>
                <p class="plans-kicker">Comparación clara</p>
                <h2 id="comparison-title">Lo importante, lado a lado</h2>
              </div>
              <p>La tabla se enfoca en los límites y beneficios que más influyen al momento de decidir.</p>
            </div>

            <div class="comparison-table-wrap">
              <table class="comparison-table">
                <caption class="sr-only">Comparación de planes InvitaSR</caption>
                <thead>
                  <tr>
                    <th scope="col">Detalle</th>
                    <th v-for="plan in comparisonPlans" :key="`head-${String(plan.id ?? plan.name)}`" scope="col">
                      {{ plan.label || formatPlanName(plan.name) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="group in comparisonGroups" :key="group.key">
                    <tr class="comparison-category">
                      <td :colspan="comparisonPlans.length + 1">{{ group.label }}</td>
                    </tr>
                    <tr v-for="item in group.items" :key="item.key">
                      <th scope="row">
                        <span>{{ item.label }}</span>
                        <small v-if="item.description">{{ item.description }}</small>
                      </th>
                      <td v-for="plan in comparisonPlans" :key="`${item.key}-${String(plan.id ?? plan.name)}`">
                        <span
                          v-if="isComparisonStatus(getComparisonValue(plan, item))"
                          class="comparison-status"
                          :class="{ included: getComparisonValue(plan, item).included }"
                          :aria-label="getComparisonLabel(getComparisonValue(plan, item))"
                          :title="getComparisonLabel(getComparisonValue(plan, item))"
                          aria-hidden="false">
                          {{ getComparisonIcon(getComparisonValue(plan, item)) }}
                        </span>
                        <span v-else>{{ getComparisonLabel(getComparisonValue(plan, item)) }}</span>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </section>

          <section class="plan-detail-section" aria-labelledby="plan-detail-title">
            <div class="comparison-head">
              <div>
                <p class="plans-kicker">Detalles por plan</p>
                <h2 id="plan-detail-title">Beneficios destacados</h2>
              </div>
              <p>Estos son los puntos más relevantes de cada opción, ordenados para decidir rápido.</p>
            </div>

            <div class="plan-detail-grid">
              <article
                v-for="plan in visiblePlans"
                :key="`detail-${String(plan.id ?? plan.name)}`"
                class="plan-detail-card"
                :class="{ 'is-pro': getPlanNameKey(plan) === 'pro' }">
                <div class="plan-detail-card-head">
                  <span>{{ formatPlanName(plan.name) }}</span>
                  <RouterLink :to="getDemoTo(plan)">Probar</RouterLink>
                </div>
                <ul>
                  <li v-for="feature in getDetailFeatures(plan)" :key="`${String(plan.id ?? '')}-${feature.key}`">
                    <span>{{ feature.badge }}</span>
                    <div>
                      <strong>{{ feature.title }}</strong>
                      <p>{{ feature.summary }}</p>
                    </div>
                  </li>
                </ul>
                <BaseButton variant="primary" @click="handleSelectPlan(plan)">Obtener plan</BaseButton>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>

    <PlanAcquisitionModal
      v-model="isAcquisitionModalOpen"
      :plan="selectedPlan"
      :show-decision-step="false"
      @registered="handleRegisteredPlan" />
  </main>
</template>

<style scoped>
.plans-page {
  min-height: 100%;
  background:
    radial-gradient(circle at 12% 10%, rgba(122, 79, 217, 0.16), transparent 34%),
    radial-gradient(circle at 88% 6%, rgba(240, 106, 166, 0.13), transparent 32%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 48%, #f5efff 100%);
}

.plans-hero {
  padding: calc(var(--public-header-height, 80px) + 58px) 0 56px;
}

.plans-hero-shell,
.comparison-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.42fr);
  align-items: end;
  gap: 28px;
}

.plans-hero-copy {
  display: grid;
  gap: 16px;
}

.plans-kicker {
  margin: 0;
  color: #6e48c4;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.plans-hero h1,
.comparison-head h2 {
  margin: 0;
  color: #27163f;
  line-height: 0.94;
  letter-spacing: -0.065em;
}

.plans-hero h1 {
  max-width: 820px;
  font-size: clamp(42px, 7vw, 86px);
}

.plans-hero p:not(.plans-kicker),
.comparison-head > p {
  margin: 0;
  color: #67587e;
  font-weight: 750;
  line-height: 1.65;
}

.plans-hero p:not(.plans-kicker) {
  max-width: 720px;
  font-size: clamp(16px, 1.35vw, 19px);
}

.plans-hero-card {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(122, 79, 217, 0.16);
  border-radius: 30px;
  padding: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 106, 166, 0.18), transparent 35%),
    rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 60px rgba(72, 39, 120, 0.1);
}

.plans-hero-card span {
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.plans-hero-card strong {
  color: #2f2145;
  font-size: 1.15rem;
  line-height: 1.35;
}

.plans-hero-card a,
.plan-summary-actions a,
.plan-detail-card-head a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  width: max-content;
  border: 1px solid rgba(122, 79, 217, 0.2);
  border-radius: 999px;
  padding: 0 18px;
  color: #6e45cc;
  background: rgba(122, 79, 217, 0.08);
  font-size: 0.9rem;
  font-weight: 900;
  text-decoration: none;
}

.plans-content {
  padding: 0 0 96px;
}

.plans-shell {
  display: grid;
  gap: 34px;
  width: min(1320px, 92vw);
}

.plans-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 260px;
  border: 1px solid rgba(122, 79, 217, 0.14);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  color: #65577d;
}

.plans-state-error {
  color: #7a3342;
  background: #fff7f8;
}

.plan-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.plan-summary-card {
  display: grid;
  gap: 16px;
  border: 1px solid rgba(224, 211, 247, 0.9);
  border-radius: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 24px 58px rgba(61, 34, 104, 0.08);
}

.plan-summary-card.is-pro {
  border-color: rgba(239, 93, 168, 0.38);
  background:
    radial-gradient(circle at 50% -10%, rgba(240, 106, 166, 0.18), transparent 32%),
    linear-gradient(180deg, #fff, #fff7fd);
}

.plan-summary-card.is-preferred {
  box-shadow: 0 0 0 4px rgba(122, 79, 217, 0.1), 0 24px 58px rgba(61, 34, 104, 0.1);
}

.plan-summary-top,
.plan-summary-actions,
.plan-detail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.plan-summary-top span,
.plan-summary-top strong {
  display: inline-flex;
  align-items: center;
  width: max-content;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.plan-summary-top span {
  color: #6d41c8;
  background: rgba(122, 79, 217, 0.1);
}

.plan-summary-top strong {
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9, #ef5da8);
}

.plan-summary-card h2 {
  margin: 0;
  color: #2f2145;
  font-size: clamp(2.4rem, 4.5vw, 4rem);
  line-height: 0.92;
  letter-spacing: -0.058em;
}

.plan-summary-card p,
.plan-price span,
.plan-detail-card p,
.comparison-table small {
  margin: 0;
  color: #67587e;
  line-height: 1.5;
}

.plan-summary-card p {
  font-weight: 750;
}

.plan-price {
  display: grid;
  gap: 7px;
}

.plan-price strong {
  color: #5f2bc9;
  font-size: clamp(2rem, 3vw, 2.8rem);
  line-height: 1;
  letter-spacing: -0.045em;
}

.plan-price span {
  font-weight: 850;
}

.plan-summary-actions :deep(.btn) {
  flex: 1;
  min-height: 48px;
}

.comparison-panel,
.plan-detail-section {
  display: grid;
  gap: 22px;
  border: 1px solid rgba(122, 79, 217, 0.12);
  border-radius: 34px;
  padding: 28px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 26px 70px rgba(61, 34, 104, 0.08);
}

.comparison-head h2 {
  margin-top: 6px;
  font-size: clamp(32px, 4vw, 54px);
}

.comparison-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(122, 79, 217, 0.12);
  border-radius: 26px;
  background: #fff;
}

.comparison-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

.comparison-table th,
.comparison-table td {
  border-bottom: 1px solid rgba(122, 79, 217, 0.1);
  padding: 18px;
  text-align: left;
  vertical-align: middle;
}

.comparison-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: #4f3870;
  background: #fbf7ff;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.comparison-table tbody th {
  display: grid;
  gap: 5px;
  min-width: 280px;
  color: #27163f;
}

.comparison-table tbody th span {
  font-size: 1rem;
}

.comparison-table td {
  color: #35214f;
  font-weight: 900;
}

.comparison-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  min-height: 22px;
  color: #dc2626;
  font-size: 1.08rem;
  font-weight: 950;
  line-height: 1;
  letter-spacing: 0.02em;
}

.comparison-status.included {
  position: relative;
  width: 24px;
  height: 22px;
  color: #16a34a;
}

.comparison-status.included::before {
  content: "";
  width: 9px;
  height: 16px;
  border-right: 4px solid currentColor;
  border-bottom: 4px solid currentColor;
  border-radius: 2px;
  transform: rotate(42deg) translateY(-2px);
  filter: drop-shadow(0 6px 10px rgba(22, 163, 74, 0.2));
}

.comparison-category td {
  padding: 14px 18px;
  color: #7a4fd9;
  background: rgba(122, 79, 217, 0.07);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.plan-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.plan-detail-card {
  display: grid;
  gap: 16px;
  align-content: start;
  border: 1px solid rgba(224, 211, 247, 0.9);
  border-radius: 28px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.88);
}

.plan-detail-card.is-pro {
  border-color: rgba(239, 93, 168, 0.34);
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 106, 166, 0.14), transparent 34%),
    rgba(255, 255, 255, 0.92);
}

.plan-detail-card-head > span {
  color: #27163f;
  font-size: 1.35rem;
  font-weight: 950;
  letter-spacing: -0.035em;
}

.plan-detail-card ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-detail-card li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(122, 79, 217, 0.1);
  border-radius: 18px;
  background: rgba(250, 247, 255, 0.82);
}

.plan-detail-card li > span {
  display: inline-flex;
  align-items: center;
  align-self: start;
  border-radius: 999px;
  padding: 7px 9px;
  color: #6d41c8;
  background: rgba(122, 79, 217, 0.1);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.plan-detail-card strong {
  display: block;
  color: #27163f;
  font-size: 0.94rem;
}

.plan-detail-card p {
  margin-top: 3px;
  font-size: 0.9rem;
}

.plan-detail-card :deep(.btn) {
  min-height: 48px;
}

@media (max-width: 1080px) {
  .plans-hero-shell,
  .comparison-head {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .plan-summary-grid,
  .plan-detail-grid {
    grid-template-columns: 1fr;
  }

  .plan-summary-card {
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.72fr);
    align-items: center;
  }

  .plan-summary-top,
  .plan-summary-card h2,
  .plan-summary-card > p,
  .plan-price,
  .plan-summary-actions {
    grid-column: 1;
  }

  .plan-summary-actions {
    grid-column: 2;
    grid-row: 1 / span 4;
    flex-direction: column;
    align-items: stretch;
  }

  .plan-summary-actions a {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .plans-hero {
    padding: calc(var(--public-header-height, 80px) + 34px) 0 42px;
  }

  .plans-shell {
    width: min(100% - 32px, 560px);
    gap: 24px;
  }

  .plans-hero h1 {
    font-size: clamp(38px, 12vw, 58px);
  }

  .plans-hero-card,
  .comparison-panel,
  .plan-detail-section,
  .plan-summary-card {
    border-radius: 24px;
    padding: 18px;
  }

  .plan-summary-card,
  .plan-summary-actions {
    grid-template-columns: 1fr;
    grid-column: auto;
    grid-row: auto;
  }

  .plan-summary-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .plan-summary-actions a,
  .plans-hero-card a,
  .plan-detail-card-head a {
    width: 100%;
  }

  .comparison-table {
    min-width: 760px;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 15px;
  }

  .plan-detail-card li {
    grid-template-columns: 1fr;
  }
}
</style>
