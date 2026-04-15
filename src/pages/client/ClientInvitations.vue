<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSessionStore } from '@/stores/session'
import { getPublicOnboardingProfile, type PublicOnboardingProfile } from '@/services/publicOnboarding'
import {
  getClientPlanStatusLabel,
  getNextStepLabel,
  getOnboardingStatusLabel,
  getSelectedTemplateName,
} from '@/utils/clientPanel'

const session = useSessionStore()

const profile = ref<PublicOnboardingProfile | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const selectedTemplateId = computed(() => profile.value?.onboarding?.template?.id)
const selectedTemplateName = computed(() => getSelectedTemplateName(profile.value))
const hasTemplatePreview = computed(() => Boolean(selectedTemplateId.value))

const checklist = computed(() => [
  {
    title: 'Revisar plan y activacion',
    status: getClientPlanStatusLabel(session.user),
  },
  {
    title: 'Confirmar onboarding',
    status: getOnboardingStatusLabel(profile.value),
  },
  {
    title: 'Validar template base',
    status: selectedTemplateName.value,
  },
  {
    title: 'Preparar siguiente paso',
    status: getNextStepLabel(profile.value),
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
    loadError.value = payload?.message ?? 'No pudimos cargar el resumen de tus invitaciones.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-invitations-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Operacion del evento</p>
        <h1 id="client-invitations-title">Mis invitaciones</h1>
        <p class="client-lead">
          Este modulo centralizara borradores, publicadas y proximas acciones del tenant. En esta etapa deja lista la base operativa.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton
          v-if="hasTemplatePreview"
          as="RouterLink"
          :to="`/templates/${selectedTemplateId}/preview`"
          variant="primary">
          Ver template actual
        </BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="ghost">Ir a configuracion</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando resumen del tenant...</p>

    <section class="bo-card invitation-empty-state">
      <div class="empty-copy">
        <span class="empty-badge">Sin listado sincronizado</span>
        <h2>Aun no encontramos invitaciones del tenant en esta vista.</h2>
        <p>
          El panel ya esta preparado para la operacion del cliente. El siguiente paso natural es conectar el listado real de invitaciones desde la capa tenant de la API.
        </p>
      </div>

      <div class="empty-actions">
        <BaseButton as="RouterLink" to="/panel/estadisticas" variant="ghost">Ver estadisticas</BaseButton>
        <BaseButton as="RouterLink" to="/panel/configuracion" variant="primary">Completar configuracion</BaseButton>
      </div>
    </section>

    <section class="bo-card invitation-readiness">
      <header class="section-head">
        <div>
          <h2>Checklist de readiness</h2>
          <p>Lo que hoy sostiene la futura gestion de invitaciones del tenant.</p>
        </div>
      </header>

      <ul class="readiness-list">
        <li v-for="item in checklist" :key="item.title">
          <strong>{{ item.title }}</strong>
          <span>{{ item.status }}</span>
        </li>
      </ul>
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
.invitation-empty-state,
.invitation-readiness {
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
.empty-copy h2,
.section-head h2 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.empty-copy p,
.section-head p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.invitation-empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background:
    radial-gradient(circle at top right, rgba(184, 141, 255, 0.18), transparent 36%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.98), rgba(248, 242, 255, 0.95));
}

.empty-copy {
  display: grid;
  gap: 0.65rem;
  max-width: 64ch;
}

.empty-badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  background: rgba(123, 78, 224, 0.12);
  color: #7b4ee0;
  font-size: 12px;
  font-weight: 700;
}

.empty-actions {
  display: grid;
  gap: 0.75rem;
  min-width: 240px;
}

.section-head {
  margin-bottom: 1rem;
}

.readiness-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.readiness-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(248, 243, 255, 0.88);
  border: 1px solid rgba(155, 107, 255, 0.14);
}

.readiness-list strong {
  color: var(--brand-ink);
}

.readiness-list span {
  text-align: right;
  color: #5a308c;
  font-weight: 700;
}

@media (max-width: 900px) {
  .client-page-head,
  .invitation-empty-state {
    flex-direction: column;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .empty-actions,
  .empty-actions :deep(.btn) {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .readiness-list li {
    flex-direction: column;
    align-items: flex-start;
  }

  .readiness-list span {
    text-align: left;
  }
}
</style>
