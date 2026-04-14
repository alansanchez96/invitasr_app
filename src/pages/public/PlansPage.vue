<script setup lang="ts">
import { ref } from 'vue'
import PlanAcquisitionModal from '@/components/public/PlanAcquisitionModal.vue'
import PublicPlanCatalogGrid from '@/components/public/PublicPlanCatalogGrid.vue'
import type { CatalogPlanListItem } from '@/services/catalogs'

const isModalOpen = ref(false)
const selectedPlan = ref<CatalogPlanListItem | null>(null)

const openPlanModal = (plan: CatalogPlanListItem) => {
  selectedPlan.value = plan
  isModalOpen.value = true
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
    :plan="selectedPlan" />
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
