<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PlanAcquisitionModal from '@/components/public/PlanAcquisitionModal.vue'
import { useSessionStore } from '@/stores/session'
import type { PublicOnboardingRegistrationInput } from '@/services/publicOnboarding'

type PlanCard = {
  id: number
  name: string
  description: string
  price_usd: number
  billing_type: 'one_time' | 'subscription'
  points: string[]
  featured?: boolean
}

const router = useRouter()
const session = useSessionStore()
const isModalOpen = ref(false)
const selectedPlan = ref<PlanCard | null>(null)
const DRAFT_KEY = 'public_onboarding_draft'

const loadDraft = (): PublicOnboardingRegistrationInput | null => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicOnboardingRegistrationInput
  } catch {
    return null
  }
}

const plans: PlanCard[] = [
  {
    id: 2,
    name: 'Basic',
    description: 'Lo esencial para bodas elegantes.',
    price_usd: 9.99,
    billing_type: 'one_time',
    points: ['2 plantillas', 'Galeria limitada', 'Dominio personalizado'],
    featured: true,
  },
  {
    id: 3,
    name: 'Pro',
    description: 'Experiencia completa y muro de deseos.',
    price_usd: 19.99,
    billing_type: 'one_time',
    points: ['Hasta 8 plantillas', 'RSVP avanzado', 'Musica libre'],
  },
  {
    id: 4,
    name: 'Premium',
    description: 'Escala tu operacion con soporte continuo.',
    price_usd: 29.99,
    billing_type: 'subscription',
    points: ['Suscripcion activa', 'Soporte prioritario', 'Mayor capacidad'],
  },
]

const openPlanModal = async (plan: PlanCard) => {
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
      planId: selectedPlan.value ? String(selectedPlan.value.id) : undefined,
      planName: selectedPlan.value?.name,
    },
  })
}
</script>

<template>
  <section id="planes" class="section plans">
    <div class="container">
      <h1 class="section-title">Planes InvitaSR</h1>
      <p class="section-lead">Elige tu plan y activa tu cuenta en minutos.</p>

      <div class="plan-grid">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="card plan-card"
          :class="{ featured: plan.featured }">
          <div>
            <h3>{{ plan.name }}</h3>
            <p>{{ plan.description }}</p>
            <strong class="price">${{ plan.price_usd.toFixed(2) }} USD</strong>
          </div>
          <ul>
            <li v-for="point in plan.points" :key="point">{{ point }}</li>
          </ul>
          <div class="card-actions">
            <BaseButton variant="ghost" disabled>Probar plantilla</BaseButton>
            <BaseButton variant="primary" @click="openPlanModal(plan)">Obtener plan</BaseButton>
          </div>
        </article>
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.plan-card {
  display: grid;
  gap: 14px;
}

.plan-card ul {
  padding-left: 18px;
  color: var(--muted);
  margin: 0;
}

.plan-card li {
  margin-bottom: 8px;
}

.price {
  display: block;
  margin-top: 10px;
  font-size: 20px;
  color: #7a4fd9;
}

.card-actions {
  display: grid;
  gap: 8px;
}

.plan-card.featured {
  border: 2px solid rgba(155, 107, 255, 0.4);
  box-shadow: var(--shadow-soft);
}

@media (max-width: 960px) {
  .plan-grid {
    grid-template-columns: 1fr;
  }
}
</style>
