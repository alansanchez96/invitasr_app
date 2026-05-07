<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  listCatalogPlans,
  type CatalogPlanListItem,
} from '@/services/catalogs'
import {
  buildTopPlanHighlights,
  formatBillingLabel,
  formatPlanName,
  formatPlanPrice,
  resolvePlanMeta,
  resolvePlanNarrative,
  selectCommercialPlans,
} from '@/utils/publicPlanMarketing'

const props = withDefaults(
  defineProps<{
    primaryActionLabel?: string
  }>(),
  {
    primaryActionLabel: 'Obtener plan',
  },
)

const emit = defineEmits<{
  (event: 'select-plan', plan: CatalogPlanListItem): void
}>()

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const plans = ref<CatalogPlanListItem[]>([])

const planOrder: Record<string, number> = {
  basic: 1,
  pro: 2,
  planner: 3,
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

const getCardClass = (plan: CatalogPlanListItem) => ({
  [`plan-card-${getPlanNameKey(plan)}`]: true,
})

const handlePrimaryAction = (plan: CatalogPlanListItem) => {
  emit('select-plan', plan)
}

const loadPlans = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const response = await listCatalogPlans({ page: 1, perPage: 10 })
    plans.value = response.list
  } catch {
    loadError.value = 'No pudimos cargar las opciones disponibles en este momento.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPlans)
</script>

<template>
  <div v-if="isLoading" class="plan-state" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <p>Cargando opciones disponibles...</p>
  </div>

  <div v-else-if="loadError" class="plan-state plan-state-error" role="alert">
    <p>{{ loadError }}</p>
  </div>

  <div v-else class="plan-grid">
    <article
      v-for="plan in visiblePlans"
      :key="String(plan.id ?? plan.name)"
      class="plan-card"
      :class="getCardClass(plan)">
      <div class="plan-card-top">
        <span class="plan-eyebrow">{{ formatBillingLabel(plan.billing_type) }}</span>
        <span v-if="getPlanNameKey(plan) === 'pro'" class="plan-favorite">Recomendado</span>
        <span v-else-if="getPlanNameKey(plan) === 'planner'" class="plan-curiosity">Para explorar</span>
      </div>

      <div class="plan-copy">
        <h3>{{ formatPlanName(plan.name) }}</h3>
        <p>{{ resolvePlanNarrative(plan) }}</p>
        <strong>{{ formatPlanPrice(plan.price_usd, plan.billing_type) }}</strong>
        <small v-if="resolvePlanMeta(plan)">{{ resolvePlanMeta(plan) }}</small>
      </div>

      <ul class="plan-highlights" aria-label="Beneficios principales">
        <li v-for="highlight in buildTopPlanHighlights(plan.features)" :key="`${String(plan.id ?? '')}-${highlight.key}`">
          <span aria-hidden="true"></span>
          <div>
            <strong>{{ highlight.title }}</strong>
            <p>{{ highlight.summary }}</p>
          </div>
        </li>
      </ul>

      <div class="plan-actions">
        <BaseButton variant="primary" @click="handlePrimaryAction(plan)">
          {{ props.primaryActionLabel }}
        </BaseButton>
        <RouterLink class="plan-compare-link" :to="{ name: 'planes', query: { plan: getPlanNameKey(plan) || undefined } }">
          Comparar planes
        </RouterLink>
      </div>
    </article>
  </div>
</template>

<style scoped>
.plan-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 260px;
  border: 1px solid rgba(122, 79, 217, 0.14);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  color: #65577d;
}

.plan-state-error {
  color: #7a3342;
  background: #fff7f8;
}

.plan-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.92fr) minmax(280px, 1.06fr) minmax(240px, 0.92fr);
  grid-template-areas: "basic pro planner";
  gap: 18px;
  align-items: stretch;
}

.plan-card {
  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 18px;
  border: 1px solid rgba(224, 211, 247, 0.9);
  border-radius: 32px;
  padding: 24px;
  background:
    radial-gradient(circle at 88% 0%, rgba(240, 106, 166, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 245, 255, 0.96));
  box-shadow: 0 22px 52px rgba(61, 34, 104, 0.08);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.plan-card:hover {
  border-color: rgba(122, 79, 217, 0.28);
  box-shadow: 0 32px 76px rgba(61, 34, 104, 0.14);
  transform: translateY(-4px);
}

.plan-card-pro {
  grid-area: pro;
  border-color: rgba(239, 93, 168, 0.34);
  background:
    radial-gradient(circle at 50% -8%, rgba(240, 106, 166, 0.24), transparent 32%),
    radial-gradient(circle at 2% 14%, rgba(122, 79, 217, 0.12), transparent 34%),
    linear-gradient(180deg, #fff, #fff7fd 48%, #f7efff);
  box-shadow: 0 28px 72px rgba(122, 79, 217, 0.14);
}

.plan-card-basic {
  grid-area: basic;
}

.plan-card-planner {
  grid-area: planner;
}

.plan-card-top,
.plan-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-eyebrow,
.plan-favorite,
.plan-curiosity {
  display: inline-flex;
  align-items: center;
  width: max-content;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

.plan-eyebrow {
  padding: 8px 11px;
  background: rgba(122, 79, 217, 0.1);
  color: #6d41c8;
}

.plan-favorite {
  padding: 8px 12px;
  color: #fff;
  background: linear-gradient(120deg, #7a4fd9, #ef5da8);
  box-shadow: 0 14px 30px rgba(122, 79, 217, 0.2);
}

.plan-curiosity {
  padding: 8px 11px;
  background: rgba(25, 15, 42, 0.08);
  color: #4b336d;
}

.plan-copy {
  display: grid;
  gap: 10px;
}

.plan-copy h3 {
  margin: 0;
  color: #2f2145;
  font-size: clamp(2.1rem, 3.8vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.055em;
}

.plan-copy p,
.plan-copy small,
.plan-highlights p {
  margin: 0;
  color: #67597f;
  line-height: 1.5;
}

.plan-copy > p {
  font-weight: 700;
}

.plan-copy strong {
  color: #5f2bc9;
  font-size: clamp(2rem, 3vw, 2.8rem);
  line-height: 1;
  letter-spacing: -0.045em;
}

.plan-copy small {
  font-weight: 800;
}

.plan-highlights {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-highlights li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(232, 224, 248, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
}

.plan-highlights li > span {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 999px;
  background: linear-gradient(120deg, #7a4fd9, #ef5da8);
  box-shadow: 0 0 0 5px rgba(122, 79, 217, 0.08);
}

.plan-highlights strong {
  display: block;
  color: #2f2145;
  font-size: 0.94rem;
}

.plan-highlights p {
  margin-top: 3px;
  font-size: 0.9rem;
}

.plan-actions {
  align-items: stretch;
  margin-top: auto;
}

.plan-actions :deep(.btn),
.plan-compare-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 0.86rem;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
}

.plan-actions :deep(.btn) {
  flex: 1.1;
}

.plan-compare-link {
  flex: 1;
  border: 1px solid rgba(122, 79, 217, 0.2);
  background: rgba(122, 79, 217, 0.08);
  color: #6e45cc;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.plan-compare-link:hover,
.plan-compare-link:focus-visible {
  background: #6e45cc;
  color: #fff;
  transform: translateY(-1px);
}

@media (max-width: 1120px) {
  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "pro pro"
      "basic planner";
  }

  .plan-card-pro {
    grid-column: 1 / -1;
  }

  .plan-card,
  .plan-card:hover {
    transform: none;
  }
}

@media (max-width: 920px) {
  .plan-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "pro"
      "basic"
      "planner";
  }

  .plan-card {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .plan-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "pro"
      "basic"
      "planner";
  }

  .plan-card {
    border-radius: 24px;
    padding: 20px;
  }

  .plan-card-top,
  .plan-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .plan-actions :deep(.btn),
  .plan-compare-link {
    width: 100%;
  }
}
</style>
