import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getCatalogPlan,
  listCatalogPlans,
  listCatalogPlanFeatures,
  listCatalogTemplates,
  listCatalogTypeEvents,
  type CatalogPlanFeatureItem,
  type CatalogPlanListItem,
  type CatalogTemplateItem,
  type CatalogTypeEventItem,
} from '@/services/catalogs'

export const useCatalogStore = defineStore('catalogs', () => {
  const plans = ref<CatalogPlanListItem[]>([])
  const templates = ref<CatalogTemplateItem[]>([])
  const typeEvents = ref<CatalogTypeEventItem[]>([])
  const planFeatures = ref<Record<string, CatalogPlanFeatureItem[]>>({})
  const isLoadingPlans = ref(false)
  const isLoadingTemplates = ref(false)
  const isLoadingTypeEvents = ref(false)

  const ensurePlans = async () => {
    if (plans.value.length) return plans.value
    isLoadingPlans.value = true
    try {
      const response = await listCatalogPlans({ page: 1, perPage: 20 })
      plans.value = response.list
      return plans.value
    } finally {
      isLoadingPlans.value = false
    }
  }

  const ensureTypeEvents = async () => {
    if (typeEvents.value.length) return typeEvents.value
    isLoadingTypeEvents.value = true
    try {
      const response = await listCatalogTypeEvents({ page: 1, perPage: 50 })
      typeEvents.value = response.list
      return typeEvents.value
    } finally {
      isLoadingTypeEvents.value = false
    }
  }

  const loadTemplates = async (params: {
    plan_id?: string | number
    type_event_id?: string | number
    name?: string
  }) => {
    isLoadingTemplates.value = true
    try {
      const response = await listCatalogTemplates({
        ...params,
        page: 1,
        perPage: 50,
      })
      templates.value = response.list
      return response.list
    } finally {
      isLoadingTemplates.value = false
    }
  }

  const ensurePlanFeatures = async (planId: string | number) => {
    const cacheKey = String(planId)
    if (planFeatures.value[cacheKey]?.length) return planFeatures.value[cacheKey] ?? []
    const list = await listCatalogPlanFeatures(planId)
    planFeatures.value = {
      ...planFeatures.value,
      [cacheKey]: list,
    }
    return list
  }

  const getPlanById = async (planId: string | number) => {
    const existing = plans.value.find((plan) => String(plan.id) === String(planId))
    if (existing) return existing
    const plan = await getCatalogPlan(planId)
    plans.value = [...plans.value.filter((item) => String(item.id) !== String(planId)), plan]
    return plan
  }

  return {
    plans,
    templates,
    typeEvents,
    planFeatures,
    isLoadingPlans,
    isLoadingTemplates,
    isLoadingTypeEvents,
    ensurePlans,
    ensureTypeEvents,
    loadTemplates,
    ensurePlanFeatures,
    getPlanById,
  }
})
