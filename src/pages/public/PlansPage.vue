<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PlanAcquisitionModal from '@/components/public/PlanAcquisitionModal.vue'
import PublicPlanCatalogGrid from '@/components/public/PublicPlanCatalogGrid.vue'
import type { CatalogPlanListItem } from '@/services/catalogs'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const isModalOpen = ref(false)
const selectedPlan = ref<CatalogPlanListItem | null>(null)

const continueWithPlan = async (plan: CatalogPlanListItem) => {
  await router.push({
    name: 'public-onboarding-flow',
    query: {
      planId: plan?.id ? String(plan.id) : undefined,
      planName: plan?.name ?? undefined,
    },
  })
}

const openPlanModal = (plan: CatalogPlanListItem) => {
  selectedPlan.value = plan

  if (session.isAuthenticated && session.isClient) {
    void continueWithPlan(plan)
    return
  }

  isModalOpen.value = true
}

const handleRegistered = async () => {
  isModalOpen.value = false
  if (selectedPlan.value) {
    await continueWithPlan(selectedPlan.value)
  }
}
</script>

<template>
  <section id="planes" class="section plans">
    <div class="container">
      <h1 class="section-title">Planes InvitaSR</h1>
      <p class="section-lead">Explora el catálogo público de planes y elige la opción ideal para tu evento.</p>

      <div class="plan-grid">
        <PublicPlanCatalogGrid
          primary-action-label="Obtener plan"
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

.plan-grid {
  margin-top: 1.5rem;
}
</style>
