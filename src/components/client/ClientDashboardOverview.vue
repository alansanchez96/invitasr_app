<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import { getPublicOnboardingProfile, type PublicOnboardingProfile } from '@/services/publicOnboarding'
import {
  getClientBillingLabel,
  getClientPlanName,
  getClientPlanStatusLabel,
  getNextStepLabel,
  getOnboardingStatusLabel,
  getRegistrationName,
  getSelectedTemplateName,
  getTenantStatusLabel,
} from '@/utils/clientPanel'

const session = useSessionStore()

const profile = ref<PublicOnboardingProfile | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const customerName = computed(() => {
  const fullName = [session.user?.name, session.user?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim()

  return fullName || session.user?.email || getRegistrationName(profile.value)
})

const summaryCards = computed(() => [
  {
    label: 'Plan actual',
    value: getClientPlanName(session.user),
    hint: getClientBillingLabel(session.user),
  },
  {
    label: 'Estado del plan',
    value: getClientPlanStatusLabel(session.user),
    hint: session.hasActiveClientPlan ? 'Ya puedes usar las funciones principales de tu cuenta.' : 'Revisa el pago o el paso pendiente para seguir.',
  },
  {
    label: 'Estado de tu cuenta',
    value: getTenantStatusLabel(session.user),
    hint: session.user?.tenant?.id ? 'Tu espacio ya esta preparado.' : 'Estamos terminando de preparar tu espacio.',
  },
  {
    label: 'Proceso actual',
    value: getOnboardingStatusLabel(profile.value),
    hint: `Siguiente paso: ${getNextStepLabel(profile.value)}`,
  },
])

const workspaces = computed(() => [
  {
    title: 'Mis invitaciones',
    description: 'Revisa el estado de tus invitaciones, el estilo elegido y el siguiente paso para publicarlas.',
    to: '/panel/invitaciones',
  },
  {
    title: 'Estadisticas',
    description: 'Consulta el estado de tu cuenta y deja todo listo para ver metricas reales en cuanto se activen.',
    to: '/panel/estadisticas',
  },
  {
    title: 'Configuracion',
    description: 'Actualiza tus datos, revisa tu plan y deja lista la informacion clave de tu cuenta.',
    to: '/panel/configuracion',
  },
])

const setupCards = computed(() => [
  {
    title: 'Estilo seleccionado',
    value: getSelectedTemplateName(profile.value),
    hint: 'Es la base visual de tu primera invitacion.',
  },
  {
    title: 'Estado del plan',
    value: getClientPlanStatusLabel(session.user),
    hint: 'Te indica si tu acceso ya esta listo o si aun falta un paso.',
  },
  {
    title: 'Siguiente paso',
    value: getNextStepLabel(profile.value),
    hint: 'Te muestra lo mas importante para continuar sin perder tiempo.',
  },
])

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const response = await getPublicOnboardingProfile()
    profile.value = response.profile
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar el resumen de tu cuenta.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <section class="client-dashboard container" aria-labelledby="client-dashboard-title">
    <header class="client-hero bo-card">
      <div>
        <p class="client-kicker">Tu panel</p>
        <h1 id="client-dashboard-title">Hola, {{ customerName }}</h1>
        <p class="client-lead">
          Aqui puedes ver el estado de tu cuenta, tu plan y los accesos principales para empezar a trabajar en tu invitacion.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel/invitaciones" variant="primary">Ir a mis invitaciones</BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Revisar configuracion</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando el resumen de tu cuenta...</p>

    <section class="client-kpis" aria-label="Resumen de acceso y estado">
      <article v-for="item in summaryCards" :key="item.label" class="client-kpi-card bo-card">
        <span class="client-kpi-label">{{ item.label }}</span>
        <strong class="client-kpi-value">{{ item.value }}</strong>
        <p class="client-kpi-hint">{{ item.hint }}</p>
      </article>
    </section>

    <section class="client-grid" aria-label="Secciones del dashboard">
      <article class="bo-card client-section-card">
        <header class="section-head">
          <div>
            <h2>Tu espacio de trabajo</h2>
            <p>Los accesos principales para avanzar con tu evento.</p>
          </div>
        </header>

        <div class="workspace-grid">
          <RouterLink v-for="item in workspaces" :key="item.to" :to="item.to" class="workspace-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
            <span>Entrar</span>
          </RouterLink>
        </div>
      </article>

      <article class="bo-card client-section-card">
        <header class="section-head">
          <div>
            <h2>Configuracion recomendada</h2>
            <p>Lo minimo que deberias tener controlado antes de publicar.</p>
          </div>
        </header>

        <ul class="setup-list">
          <li v-for="item in setupCards" :key="item.title" class="setup-item">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.hint }}</p>
            </div>
            <span>{{ item.value }}</span>
          </li>
        </ul>
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

.client-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  background:
    radial-gradient(circle at top right, rgba(184, 141, 255, 0.18), transparent 34%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.98), rgba(248, 242, 255, 0.95));
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-hero h1,
.section-head h2 {
  margin: 0;
}

.client-lead,
.section-head p,
.client-kpi-hint,
.workspace-card p,
.setup-item p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.client-inline-note {
  margin: 0;
  color: #6a5a84;
  font-weight: 600;
}

.client-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.client-kpi-card,
.client-section-card {
  padding: 22px;
}

.client-kpi-card {
  display: grid;
  gap: 0.45rem;
}

.client-kpi-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.client-kpi-value {
  font-size: clamp(1.2rem, 1.6vw, 1.55rem);
  line-height: 1.1;
  color: var(--brand-ink);
}

.client-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 1rem;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.workspace-card {
  display: grid;
  gap: 0.45rem;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(155, 107, 255, 0.16);
  background: linear-gradient(180deg, #ffffff, #faf6ff);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.workspace-card:hover,
.workspace-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(155, 107, 255, 0.34);
  box-shadow: 0 18px 34px rgba(58, 33, 111, 0.12);
}

.workspace-card strong,
.setup-item strong {
  color: var(--brand-ink);
}

.workspace-card span {
  margin-top: 0.45rem;
  font-weight: 700;
  color: #7b4ee0;
}

.setup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.setup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 15px 16px;
  border-radius: 16px;
  background: rgba(248, 243, 255, 0.88);
  border: 1px solid rgba(155, 107, 255, 0.14);
}

.setup-item span {
  font-weight: 700;
  color: var(--brand-ink);
  text-align: right;
}

@media (max-width: 1100px) {
  .client-kpis,
  .workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .client-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-hero {
    padding: 20px;
    flex-direction: column;
  }

  .client-actions {
    width: 100%;
    justify-content: stretch;
  }

  .client-actions :deep(.btn) {
    width: 100%;
  }

  .client-kpis,
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .client-kpi-card,
  .client-section-card {
    padding: 18px;
  }

  .setup-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .setup-item span {
    text-align: left;
  }
}
</style>
