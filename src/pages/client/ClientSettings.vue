<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import {
  getPublicOnboardingProfile,
  updatePublicOnboardingProfile,
  type PublicOnboardingProfile,
} from '@/services/publicOnboarding'
import {
  getClientBillingLabel,
  getClientPlanName,
  getClientPlanStatusLabel,
  getNextStepLabel,
  getSelectedTemplateName,
} from '@/utils/clientPanel'
import { notifyError, notifySuccess } from '@/utils/toast'

const session = useSessionStore()
const catalogStore = useCatalogStore()
const { countries } = storeToRefs(catalogStore)

const profile = ref<PublicOnboardingProfile | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)

const form = reactive({
  full_name: '',
  email: '',
  country_code: '',
})

const patchSessionName = (fullName: string, email: string) => {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  const [name = '', ...rest] = normalized.split(' ')
  session.patchUser({
    name,
    last_name: rest.join(' '),
    email,
  })
}

const syncForm = (nextProfile: PublicOnboardingProfile | null) => {
  form.full_name = nextProfile?.registration?.full_name ?? ''
  form.email = nextProfile?.registration?.email ?? session.user?.email ?? ''
  form.country_code = nextProfile?.registration?.country_code ?? ''
}

const summaryCards = computed(() => [
  {
    label: 'Plan',
    value: getClientPlanName(session.user),
    hint: getClientBillingLabel(session.user),
  },
  {
    label: 'Estado comercial',
    value: getClientPlanStatusLabel(session.user),
    hint: 'Se resuelve en la API segun pagos o suscripcion.',
  },
  {
    label: 'Template asociada',
    value: getSelectedTemplateName(profile.value),
    hint: 'Base visual definida hasta ahora.',
  },
  {
    label: 'Siguiente paso',
    value: getNextStepLabel(profile.value),
    hint: 'Lectura actual del flujo de onboarding.',
  },
])

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    const response = await getPublicOnboardingProfile()
    profile.value = response.profile
    syncForm(response.profile)
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tu configuracion.'
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  const onboarding = profile.value?.onboarding
  if (!onboarding?.plan_id) {
    notifyError('No encontramos un plan asociado para actualizar tu configuracion.')
    return
  }

  isSaving.value = true
  try {
    const response = await updatePublicOnboardingProfile({
      plan_id: onboarding.plan_id,
      template_id: onboarding.template_id ?? null,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      country_code: form.country_code.trim().toUpperCase(),
      register_method:
        (profile.value?.registration?.register_method as 'email' | 'google' | 'facebook' | undefined) ?? 'email',
    })

    profile.value = response.profile
    syncForm(response.profile)
    patchSessionName(form.full_name, form.email)
    notifySuccess(response.message ?? 'Configuracion actualizada.')
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos guardar la configuracion.')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  void catalogStore.ensureCountries()
  void loadProfile()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-settings-title">
    <header class="client-page-head bo-card">
      <div>
        <p class="client-kicker">Cuenta y setup</p>
        <h1 id="client-settings-title">Configuracion</h1>
        <p class="client-lead">
          Aqui concentras los datos minimos del dashboard cliente: perfil, resumen comercial, template asociada y estado del onboarding.
        </p>
      </div>

      <div class="client-actions">
        <BaseButton as="RouterLink" to="/panel" variant="ghost">Volver al panel</BaseButton>
      </div>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando configuracion...</p>

    <section class="summary-grid" aria-label="Resumen de configuracion">
      <article v-for="item in summaryCards" :key="item.label" class="bo-card summary-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="settings-grid">
      <article class="bo-card settings-card">
        <header class="section-head">
          <div>
            <h2>Datos de la cuenta</h2>
            <p>Informacion base que reutiliza el flujo publico de onboarding.</p>
          </div>
        </header>

        <form class="settings-form" @submit.prevent="saveProfile">
          <label class="field">
            <span>Nombre completo</span>
            <input v-model="form.full_name" type="text" autocomplete="name" placeholder="Ej: Alan Sanchez" />
          </label>

          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" autocomplete="email" placeholder="correo@evento.com" />
          </label>

          <label class="field">
            <span>Pais</span>
            <select v-model="form.country_code">
              <option value="">Selecciona un pais</option>
              <option v-for="country in countries" :key="country.iso ?? country.id" :value="country.iso">
                {{ country.nicename ?? country.name }}
              </option>
            </select>
          </label>

          <div class="form-actions">
            <BaseButton type="submit" variant="primary" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
            </BaseButton>
          </div>
        </form>
      </article>

      <article class="bo-card settings-card">
        <header class="section-head">
          <div>
            <h2>Configuracion estructural</h2>
            <p>Lectura operativa del tenant y del onboarding actual.</p>
          </div>
        </header>

        <ul class="structure-list">
          <li>
            <strong>Tenant ID</strong>
            <span>{{ session.user?.tenant?.id ?? '-' }}</span>
          </li>
          <li>
            <strong>Template actual</strong>
            <span>{{ getSelectedTemplateName(profile) }}</span>
          </li>
          <li>
            <strong>Plan resuelto</strong>
            <span>{{ getClientPlanName(session.user) }}</span>
          </li>
          <li>
            <strong>Billing</strong>
            <span>{{ getClientBillingLabel(session.user) }}</span>
          </li>
        </ul>
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
.summary-card,
.settings-card {
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
.section-head h2 {
  margin: 0;
}

.client-lead,
.client-inline-note,
.summary-card p,
.section-head p {
  margin: 0;
  color: #6a5a84;
}

.client-actions {
  display: flex;
  gap: 0.75rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 0.45rem;
}

.summary-card span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.65);
  font-weight: 700;
}

.summary-card strong,
.structure-list strong {
  color: var(--brand-ink);
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.section-head {
  margin-bottom: 1rem;
}

.settings-form {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  font-weight: 700;
  color: var(--brand-ink);
}

.field input {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.85rem 1rem;
  color: var(--brand-ink);
}

.field select {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(155, 107, 255, 0.2);
  background: #fff;
  padding: 0.85rem 1rem;
  color: var(--brand-ink);
}

.field input:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.field select:focus-visible {
  outline: 2px solid rgba(123, 78, 224, 0.24);
  border-color: rgba(123, 78, 224, 0.5);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 0.25rem;
}

.structure-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.structure-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(248, 243, 255, 0.88);
  border: 1px solid rgba(155, 107, 255, 0.14);
}

.structure-list span {
  text-align: right;
  color: #5a308c;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .client-page-head {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .client-actions,
  .client-actions :deep(.btn),
  .form-actions,
  .form-actions :deep(.btn) {
    width: 100%;
  }

  .structure-list li {
    flex-direction: column;
  }

  .structure-list span {
    text-align: left;
  }
}
</style>
