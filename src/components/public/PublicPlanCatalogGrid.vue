<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  listCatalogPlanFeatures,
  listCatalogPlans,
  type CatalogPlanFeatureItem,
  type CatalogPlanListItem,
} from '@/services/catalogs'
import {
  buildTopPlanHighlights,
  formatBillingLabel,
  formatPlanName,
  formatPlanPrice,
  isFeaturedCommercialPlan,
  resolvePlanBadge,
  resolvePlanMeta,
  resolvePlanNarrative,
  selectCommercialPlans,
  sortMarketingFeatures,
} from '@/utils/publicPlanMarketing'

const props = withDefaults(
  defineProps<{
    primaryActionLabel?: string
    initialDetailPlanId?: string | number | null
  }>(),
  {
    primaryActionLabel: 'Obtener plan',
    initialDetailPlanId: null,
  },
)

const emit = defineEmits<{
  (event: 'select-plan', plan: CatalogPlanListItem): void
}>()

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const plans = ref<CatalogPlanListItem[]>([])
const openDetailPlanId = ref<string | null>(null)
const detailLoadingPlanId = ref<string | null>(null)
const detailCache = ref<Record<string, CatalogPlanFeatureItem[]>>({})

const visiblePlans = computed(() => selectCommercialPlans(plans.value))

const getPlanId = (plan: CatalogPlanListItem) => {
  const raw = plan.id
  return raw === undefined || raw === null ? '' : String(raw)
}

const loadPlans = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const response = await listCatalogPlans({ page: 1, perPage: 10 })
    plans.value = response.list
  } catch {
    loadError.value = 'No pudimos cargar los planes publicos en este momento.'
  } finally {
    isLoading.value = false
  }
}

const ensureDetailFeatures = async (plan: CatalogPlanListItem) => {
  const planId = getPlanId(plan)
  if (!planId || detailCache.value[planId]) return

  detailLoadingPlanId.value = planId
  try {
    const features = await listCatalogPlanFeatures(planId)
    detailCache.value = {
      ...detailCache.value,
      [planId]: features.length ? features : plan.features,
    }
  } catch {
    detailCache.value = {
      ...detailCache.value,
      [planId]: plan.features,
    }
  } finally {
    if (detailLoadingPlanId.value === planId) {
      detailLoadingPlanId.value = null
    }
  }
}

const toggleDetails = async (plan: CatalogPlanListItem) => {
  const planId = getPlanId(plan)
  if (!planId) return

  if (openDetailPlanId.value === planId) {
    openDetailPlanId.value = null
    return
  }

  openDetailPlanId.value = planId
  await ensureDetailFeatures(plan)
}

const maybeOpenInitialDetails = async () => {
  const targetPlanId =
    props.initialDetailPlanId === null || props.initialDetailPlanId === undefined
      ? ''
      : String(props.initialDetailPlanId).trim()
  if (!targetPlanId) return

  const targetPlan = visiblePlans.value.find((plan) => getPlanId(plan) === targetPlanId)
  if (!targetPlan) return
  await toggleDetails(targetPlan)
}

const getDetailFeatures = (plan: CatalogPlanListItem) => {
  const planId = getPlanId(plan)
  return sortMarketingFeatures(detailCache.value[planId] ?? plan.features)
}

const handlePrimaryAction = (plan: CatalogPlanListItem) => {
  emit('select-plan', plan)
}

onMounted(async () => {
  await loadPlans()
  await maybeOpenInitialDetails()
})

watch(
  () => props.initialDetailPlanId,
  async () => {
    if (!visiblePlans.value.length) return
    await maybeOpenInitialDetails()
  },
)
</script>

<template>
  <div v-if="isLoading" class="plan-catalog-state" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <p>Cargando planes disponibles...</p>
  </div>

  <div v-else-if="loadError" class="plan-catalog-state is-error" role="alert">
    <p>{{ loadError }}</p>
  </div>

  <div v-else class="plan-catalog-grid">
    <article
      v-for="(plan, index) in visiblePlans"
      :key="String(plan.id ?? plan.name ?? index)"
      class="plan-card"
      :class="{
        featured: isFeaturedCommercialPlan(plan, index),
        'details-open': openDetailPlanId === String(plan.id ?? ''),
      }">
      <div class="plan-card-surface">
        <div class="plan-card-top">
          <span class="plan-badge">{{ resolvePlanBadge(plan, index) }}</span>
          <span class="plan-billing">{{ formatBillingLabel(plan.billing_type) }}</span>
        </div>

        <div class="plan-copy">
          <h3>{{ formatPlanName(plan.name) }}</h3>
          <p class="plan-description">{{ resolvePlanNarrative(plan) }}</p>
          <strong class="plan-price">{{ formatPlanPrice(plan.price_usd, plan.billing_type) }}</strong>
          <small v-if="resolvePlanMeta(plan)" class="plan-meta">{{ resolvePlanMeta(plan) }}</small>
        </div>

        <ul class="plan-highlight-list" aria-label="Funciones destacadas del plan">
          <li v-for="highlight in buildTopPlanHighlights(plan.features)" :key="`${String(plan.id ?? '')}-${highlight.key}`">
            <strong>{{ highlight.title }}</strong>
            <span>{{ highlight.summary }}</span>
          </li>
        </ul>

        <div class="plan-card-actions">
          <button type="button" class="plan-details-trigger" @click="toggleDetails(plan)">
            {{ openDetailPlanId === String(plan.id ?? '') ? 'Ocultar detalles' : 'Ver detalles' }}
          </button>
          <BaseButton variant="primary" @click="handlePrimaryAction(plan)">{{ props.primaryActionLabel }}</BaseButton>
        </div>
      </div>

      <div class="plan-detail-panel" :class="{ open: openDetailPlanId === String(plan.id ?? '') }">
        <div class="plan-detail-head">
          <div>
            <span>Detalles del plan</span>
            <h4>{{ formatPlanName(plan.name) }}</h4>
          </div>
          <button type="button" class="plan-detail-close" aria-label="Cerrar detalles" @click="toggleDetails(plan)">
            &times;
          </button>
        </div>

        <div class="plan-detail-summary">
          <strong>{{ formatPlanPrice(plan.price_usd, plan.billing_type) }}</strong>
          <p>{{ resolvePlanNarrative(plan) }}</p>
        </div>

        <div v-if="detailLoadingPlanId === String(plan.id ?? '')" class="plan-detail-state" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <p>Cargando funcionalidades completas...</p>
        </div>

        <div v-else class="plan-detail-scroll">
          <ul class="plan-detail-list" aria-label="Listado completo de funcionalidades">
            <li
              v-for="feature in getDetailFeatures(plan)"
              :key="`${String(plan.id ?? '')}-${feature.key}`"
              class="plan-detail-item">
              <div>
                <strong>{{ feature.title }}</strong>
                <p>{{ feature.summary }}</p>
              </div>
              <span class="plan-detail-badge">{{ feature.badge }}</span>
            </li>
          </ul>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.plan-catalog-state {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 34px 20px;
  border: 1px solid #eadffb;
  border-radius: 22px;
  background: linear-gradient(145deg, #fff, #faf5ff);
  color: #65577d;
}

.plan-catalog-state.is-error {
  text-align: center;
  color: #7a3342;
  background: linear-gradient(145deg, #fff7f8, #fff);
  border-color: #f2d7df;
}

.plan-catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.plan-card {
  position: relative;
  min-height: 520px;
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 245, 255, 0.96)),
    #fff;
  border: 1px solid rgba(225, 214, 246, 0.95);
  box-shadow: 0 24px 52px rgba(72, 39, 120, 0.08);
}

.plan-card.featured {
  border-color: rgba(168, 109, 255, 0.5);
  box-shadow: 0 28px 58px rgba(121, 69, 201, 0.16);
}

.plan-card-surface,
.plan-detail-panel {
  height: 100%;
}

.plan-card-surface {
  display: grid;
  gap: 18px;
  align-content: start;
  padding: 24px;
}

.plan-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-badge,
.plan-billing {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.plan-badge {
  background: rgba(122, 79, 217, 0.12);
  color: #6d41c8;
}

.plan-billing {
  background: rgba(34, 197, 94, 0.1);
  color: #0f7a3c;
}

.plan-copy {
  display: grid;
  gap: 8px;
}

.plan-copy h3,
.plan-detail-head h4 {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.1rem);
  line-height: 0.95;
  color: #2f2145;
}

.plan-description {
  margin: 0;
  color: #635579;
  min-height: 3.5em;
}

.plan-price {
  font-size: 2rem;
  line-height: 1;
  color: #5f2bc9;
}

.plan-meta {
  color: #7a6c92;
  font-weight: 600;
}

.plan-highlight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.plan-highlight-list li {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(232, 224, 248, 0.95);
}

.plan-highlight-list strong {
  color: #311d53;
  font-size: 0.95rem;
}

.plan-highlight-list span {
  color: #6a5d82;
  font-size: 0.92rem;
}

.plan-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.plan-details-trigger {
  border: none;
  background: transparent;
  color: #6e45cc;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 0;
}

.plan-detail-panel {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(31, 15, 56, 0.97), rgba(70, 31, 125, 0.98)),
    #281741;
  color: #fff;
  transform: translateX(100%);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}

.plan-detail-panel.open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.plan-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.plan-detail-head span {
  display: inline-flex;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.plan-detail-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}

.plan-detail-summary {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
}

.plan-detail-summary strong {
  font-size: 1.45rem;
}

.plan-detail-summary p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
}

.plan-detail-scroll {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.plan-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.plan-detail-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.plan-detail-item strong {
  display: block;
  margin-bottom: 4px;
}

.plan-detail-item p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.92rem;
}

.plan-detail-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.plan-detail-state {
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 1080px) {
  .plan-catalog-grid {
    grid-template-columns: 1fr;
  }

  .plan-card {
    min-height: 480px;
  }
}

@media (max-width: 640px) {
  .plan-card,
  .plan-card-surface,
  .plan-detail-panel {
    border-radius: 22px;
  }

  .plan-card-surface,
  .plan-detail-panel {
    padding: 20px;
  }

  .plan-card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .plan-detail-item {
    grid-template-columns: 1fr;
  }
}
</style>
