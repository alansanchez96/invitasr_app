<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  checkoutPublicOnboarding,
  getPublicOnboardingProfile,
  updatePublicOnboardingProfile,
  type PublicOnboardingProfile,
  type PublicOnboardingProfileUpdateInput,
  type PublicOnboardingRegistrationInput,
} from '@/services/publicOnboarding'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

const DRAFT_KEY = 'public_onboarding_draft'
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const catalogStore = useCatalogStore()
const { countries } = storeToRefs(catalogStore)

const isLoading = ref(true)
const isPaying = ref(false)
const loadError = ref<string | null>(null)
const profile = ref<PublicOnboardingProfile | null>(null)
const draftPayload = ref<PublicOnboardingRegistrationInput | null>(null)
const isEditModalOpen = ref(false)
const isSavingProfile = ref(false)
const editErrors = ref<Record<string, string[]>>({})

const editForm = reactive({
  full_name: '',
  email: '',
  country_code: '',
})

const planIdFromQuery = computed(() => {
  const raw = Array.isArray(route.query.planId) ? route.query.planId[0] : route.query.planId
  return raw ? String(raw).trim() : ''
})

const planNameFromQuery = computed(() => {
  const raw = Array.isArray(route.query.planName) ? route.query.planName[0] : route.query.planName
  return raw ? String(raw).trim() : ''
})

const registrationName = computed(
  () => draftPayload.value?.full_name || profile.value?.registration?.full_name || '-',
)
const registrationEmail = computed(
  () => draftPayload.value?.email || profile.value?.registration?.email || '-',
)
const registrationCountryCode = computed(
  () => draftPayload.value?.country_code || profile.value?.registration?.country_code || '',
)
const registrationCountry = computed(() => {
  if (!registrationCountryCode.value) return '-'
  const match = countries.value.find((country) => country.iso === registrationCountryCode.value)
  return match?.nicename ?? match?.name ?? registrationCountryCode.value
})
const selectedPlanId = computed(() => {
  if (planIdFromQuery.value) return planIdFromQuery.value
  if (profile.value?.onboarding?.plan_id) return String(profile.value.onboarding.plan_id)
  if (draftPayload.value?.plan_id) return String(draftPayload.value.plan_id)
  return ''
})
const selectedPlanNameFromCatalog = computed(() => {
  if (!selectedPlanId.value) return ''
  const match = catalogStore.plans.find((plan) => String(plan.id) === selectedPlanId.value)
  return match?.name?.trim() ?? ''
})
const registrationPlan = computed(() => {
  if (planNameFromQuery.value) return planNameFromQuery.value
  if (profile.value?.onboarding?.plan?.name) return profile.value.onboarding.plan.name
  if (selectedPlanNameFromCatalog.value) return selectedPlanNameFromCatalog.value
  return '-'
})

const isDraftReady = computed(() =>
  Boolean(
    draftPayload.value?.plan_id &&
      draftPayload.value?.full_name &&
      draftPayload.value?.email &&
      draftPayload.value?.country_code,
  ),
)

const loadDraft = () => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicOnboardingRegistrationInput
  } catch {
    return null
  }
}

const saveDraft = (draft: PublicOnboardingRegistrationInput) => {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const resetSensitiveState = () => {
  profile.value = null
  draftPayload.value = null
  isEditModalOpen.value = false
}

const buildDraftFromProfile = (
  source: PublicOnboardingProfile | null,
  overridePlanId?: string,
): PublicOnboardingRegistrationInput | null => {
  const registration = source?.registration
  const onboarding = source?.onboarding
  const selectedPlanId = overridePlanId || (onboarding?.plan_id ? String(onboarding.plan_id) : '')
  if (!registration || !selectedPlanId) return null

  return {
    plan_id: selectedPlanId,
    template_id: null,
    register_method: (registration.register_method as 'email' | 'google' | 'facebook') ?? 'email',
    full_name: registration.full_name?.trim() ?? '',
    email: registration.email?.trim() ?? '',
    password: '',
    country_code: registration.country_code?.trim() ?? '',
  }
}

const syncDraftWithPlan = (draft: PublicOnboardingRegistrationInput) => {
  if (planIdFromQuery.value) {
    draft.plan_id = planIdFromQuery.value
  }
  draft.template_id = null
  return draft
}

const syncSelectedPlanWithProfile = async () => {
  if (!planIdFromQuery.value || !profile.value) return

  const currentPlanId = profile.value.onboarding?.plan_id ? String(profile.value.onboarding.plan_id) : ''
  if (currentPlanId === planIdFromQuery.value) return

  const currentDraft = draftPayload.value ?? buildDraftFromProfile(profile.value)
  if (!currentDraft) return

  const response = await updatePublicOnboardingProfile({
    plan_id: planIdFromQuery.value,
    template_id: null,
    register_method: currentDraft.register_method ?? 'email',
    full_name: currentDraft.full_name,
    email: currentDraft.email,
    country_code: currentDraft.country_code,
  })

  profile.value = response.profile
  draftPayload.value = {
    ...currentDraft,
    plan_id: planIdFromQuery.value,
    template_id: null,
  }
  saveDraft(draftPayload.value)
}

const loadProfile = async () => {
  isLoading.value = true
  loadError.value = null
  draftPayload.value = loadDraft()

  try {
    const response = await getPublicOnboardingProfile()
    profile.value = response.profile
    await syncSelectedPlanWithProfile()
  } catch (error) {
    const payload = error as { message?: string; error?: { message?: string } }
    const backendMessage = payload?.error?.message ?? payload?.message ?? ''
    if (backendMessage.toLowerCase().includes('no existe un onboarding publico pendiente')) {
      if (session.hasActiveClientPlan) {
        notifySuccess('Tu plan ya esta activo. Te redirigimos al panel cliente.')
        isLoading.value = false
        await router.replace({ name: 'client-home' })
        return
      }

      notifyWarning('No encontramos un proceso pendiente para continuar. Elige un plan para empezar de nuevo.')
      isLoading.value = false
      await router.replace({ name: 'planes', query: { reason: 'new_onboarding' } })
      return
    }
    if (!draftPayload.value) {
      loadError.value = payload?.message ?? 'No encontramos una sesion activa para continuar.'
    }
  }

  if (draftPayload.value) {
    draftPayload.value = syncDraftWithPlan(draftPayload.value)
    saveDraft(draftPayload.value)
  } else {
    const fromProfile = buildDraftFromProfile(profile.value, planIdFromQuery.value)
    if (fromProfile) {
      draftPayload.value = fromProfile
      saveDraft(fromProfile)
    }
  }

  if (!draftPayload.value) {
    loadError.value = 'No encontramos datos suficientes para continuar. Vuelve a elegir tu plan.'
  }

  isLoading.value = false
}

const startCheckout = async () => {
  if (!draftPayload.value) {
    notifyWarning('Debes seleccionar un plan y completar tu registro antes de pagar.')
    return
  }

  if (!isDraftReady.value) {
    notifyWarning('Faltan algunos datos para continuar al pago.')
    return
  }

  isPaying.value = true
  try {
    await syncSelectedPlanWithProfile()
    const response = await checkoutPublicOnboarding(draftPayload.value)
    if (!response.checkout_url) {
      notifyError('No pudimos abrir el pago en este momento.')
      return
    }

    notifySuccess(response.message)
    sessionStorage.removeItem(DRAFT_KEY)
    window.location.assign(response.checkout_url)
  } catch (error) {
    const payload = error as { message?: string; errors?: Record<string, string[]> }
    if (payload?.errors && Object.keys(payload.errors).length > 0) {
      notifyWarning('Detectamos datos por corregir antes de pagar.')
      return
    }
    notifyError(payload?.message ?? 'No pudimos iniciar el pago.')
  } finally {
    isPaying.value = false
  }
}

const openEditModal = () => {
  editErrors.value = {}
  editForm.full_name = registrationName.value === '-' ? '' : registrationName.value
  editForm.email = registrationEmail.value === '-' ? '' : registrationEmail.value
  editForm.country_code = registrationCountryCode.value
  isEditModalOpen.value = true
}

const getEditError = (field: string) => editErrors.value[field]?.[0] ?? ''

const validateEditForm = () => {
  const errors: Record<string, string[]> = {}
  if (!editForm.full_name.trim()) errors.full_name = ['Ingresa tu nombre completo.']
  if (!editForm.email.trim()) errors.email = ['Ingresa tu correo.']
  if (!editForm.country_code.trim()) errors.country_code = ['Selecciona tu pais de residencia.']
  editErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveEditedProfile = async () => {
  if (!draftPayload.value) {
    notifyWarning('No encontramos datos para editar. Vuelve a seleccionar tu plan.')
    return
  }

  if (!validateEditForm()) {
    notifyWarning('Revisa los datos antes de guardar los cambios.')
    return
  }

  const payload: PublicOnboardingProfileUpdateInput = {
    plan_id: draftPayload.value.plan_id,
    template_id: null,
    register_method: draftPayload.value.register_method ?? 'email',
    full_name: editForm.full_name.trim(),
    email: editForm.email.trim(),
    country_code: editForm.country_code.trim(),
  }

  isSavingProfile.value = true
  try {
    const response = await updatePublicOnboardingProfile(payload)
    draftPayload.value = {
      ...draftPayload.value,
      full_name: payload.full_name,
      email: payload.email,
      country_code: payload.country_code,
    }
    saveDraft(draftPayload.value)
    profile.value = response.profile
    notifySuccess(response.message ?? 'Tus datos se actualizaron correctamente.')
    isEditModalOpen.value = false
  } catch (error) {
    const payloadError = error as { message?: string; errors?: Record<string, string[]> }
    if (payloadError?.errors && Object.keys(payloadError.errors).length > 0) {
      editErrors.value = payloadError.errors
      notifyWarning('Hay campos para corregir antes de guardar.')
      return
    }
    notifyError(payloadError?.message ?? 'No pudimos guardar tus cambios.')
  } finally {
    isSavingProfile.value = false
  }
}

const redirectToHomeOnLogout = () => {
  sessionStorage.removeItem(DRAFT_KEY)
  resetSensitiveState()
  notifyWarning('Tu sesion se cerro. Vuelve a iniciar desde el Home.')
  router.replace({ name: 'home' })
}

watch(
  () => session.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      redirectToHomeOnLogout()
    }
  },
)

onMounted(async () => {
  void catalogStore.ensurePlans().catch(() => {
    notifyWarning('No pudimos cargar los planes en este momento.')
  })
  void catalogStore.ensureCountries().catch(() => {
    notifyWarning('No pudimos cargar el catalogo de paises.')
  })
  if (!session.isAuthenticated) {
    const result = await session.refreshMe()
    if (!result.ok) {
      redirectToHomeOnLogout()
      return
    }
  }
  await loadProfile()
})
</script>

<template>
  <section class="section confirm-onboarding">
    <div class="container confirm-shell">
      <header class="confirm-hero">
        <span class="kicker">Ultimo paso antes de activar</span>
        <h1>Revisa tus datos y finaliza el pago de {{ registrationPlan }}.</h1>
        <p>
          Ya tienes casi todo listo. Confirmamos tus datos para mostrarte la opcion de pago correcta
          segun tu pais y ayudarte a terminar la compra de forma segura.
        </p>
      </header>

      <article v-if="isLoading" class="confirm-card state-card" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <p>Cargando el resumen de tu cuenta...</p>
      </article>

      <article v-else-if="loadError" class="confirm-card state-card" role="alert">
        <h2>No pudimos continuar</h2>
        <p>{{ loadError }}</p>
        <RouterLink class="btn btn-primary" to="/planes">Volver a planes</RouterLink>
      </article>

      <div v-else class="confirm-grid">
        <article class="confirm-card summary-card">
          <h2>Tus datos de registro</h2>
          <p class="summary-lead">Asegurate de que esta informacion sea correcta antes de continuar.</p>
          <div class="summary-row">
            <span>Nombre</span>
            <strong>{{ registrationName }}</strong>
          </div>
          <div class="summary-row">
            <span>Correo</span>
            <strong>{{ registrationEmail }}</strong>
          </div>
          <div class="summary-row">
            <span>Pais</span>
            <strong>{{ registrationCountry }}</strong>
          </div>
          <div class="summary-row">
            <span>Plan</span>
            <strong>{{ registrationPlan }}</strong>
          </div>
          <button type="button" class="btn btn-ghost edit-profile-btn" @click="openEditModal">
            Editar mis datos
          </button>
          <p v-if="!isDraftReady" class="data-warning" role="alert">
            Falta informacion de registro. Vuelve a planes, selecciona tu plan y completa el alta.
          </p>
        </article>

        <article class="confirm-card pay-card">
          <h2>Activa tu cuenta ahora</h2>
          <p>
            Cuando confirmes, te llevamos a la pasarela de pago para completar la compra en minutos.
          </p>
          <ul class="benefits-list">
            <li>Tu registro ya fue validado</li>
            <li>Activacion inmediata al confirmar el pago</li>
            <li>Continuidad inmediata en tu flujo de compra</li>
          </ul>
          <div class="actions">
            <RouterLink class="btn btn-ghost" to="/planes">Cambiar plan</RouterLink>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="isPaying || !isDraftReady"
              :aria-busy="isPaying"
              @click="startCheckout">
              {{ isPaying ? 'Redirigiendo...' : 'Confirmar e ir a pagar' }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>

  <BaseModal
    :model-value="isEditModalOpen"
    overlay-class="edit-profile-overlay"
    panel-class="edit-profile-panel"
    aria-label="Editar datos de registro"
    @update:model-value="isEditModalOpen = $event">
    <header class="edit-head">
      <h3>Editar datos de registro</h3>
      <p>Actualiza tu informacion para finalizar la compra con los datos correctos.</p>
    </header>

    <form class="edit-grid" @submit.prevent="saveEditedProfile">
      <label class="field field-full">
        <span>Nombre completo</span>
        <input v-model="editForm.full_name" type="text" autocomplete="name" :aria-invalid="Boolean(getEditError('full_name'))" />
        <small v-if="getEditError('full_name')" class="field-error">{{ getEditError('full_name') }}</small>
      </label>

      <label class="field field-full">
        <span>Correo</span>
        <input v-model="editForm.email" type="email" autocomplete="email" :aria-invalid="Boolean(getEditError('email'))" />
        <small v-if="getEditError('email')" class="field-error">{{ getEditError('email') }}</small>
      </label>

      <label class="field">
        <span>Pais de residencia</span>
        <select v-model="editForm.country_code" :aria-invalid="Boolean(getEditError('country_code'))">
          <option value="">Selecciona un pais</option>
          <option v-for="country in countries" :key="country.iso ?? country.id" :value="country.iso">
            {{ country.nicename ?? country.name }}
          </option>
        </select>
        <small v-if="getEditError('country_code')" class="field-error">{{ getEditError('country_code') }}</small>
      </label>

      <footer class="edit-actions field-full">
        <button type="button" class="btn btn-ghost" @click="isEditModalOpen = false">Cancelar</button>
        <button type="submit" class="btn btn-primary" :disabled="isSavingProfile" :aria-busy="isSavingProfile">
          {{ isSavingProfile ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  </BaseModal>
</template>

<style scoped>
.confirm-onboarding {
  padding-top: 30px;
}

.confirm-shell {
  width: min(1080px, 94vw);
  display: grid;
  gap: 16px;
}

.confirm-hero {
  border: 1px solid #e9ddff;
  border-radius: 22px;
  background: linear-gradient(140deg, #fff, #f8f1ff 65%, #fceef9);
  box-shadow: var(--shadow-card);
  padding: 24px;
}

.kicker {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #7a4fd9;
  font-weight: 700;
}

.confirm-hero h1 {
  margin: 6px 0;
  font-size: clamp(24px, 3vw, 34px);
}

.confirm-hero p {
  margin: 0;
  color: #6b5b82;
}

.confirm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.confirm-card {
  border: 1px solid #ece7f8;
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--shadow-card);
  padding: 20px;
}

.confirm-card h2 {
  margin: 0;
}

.summary-lead {
  margin: 8px 0 0;
  color: #6b6b80;
  font-size: 14px;
}

.summary-row {
  border-bottom: 1px solid #f1ebfd;
  padding: 12px 0;
  display: grid;
  gap: 3px;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row span {
  font-size: 12px;
  color: #6b6b80;
}

.summary-row strong {
  color: #2f2541;
}

.edit-profile-btn {
  margin-top: 14px;
}

.data-warning {
  margin: 14px 0 0;
  padding: 10px 12px;
  border: 1px solid #f9d7a3;
  border-radius: 12px;
  background: #fff7e8;
  color: #8b5a11;
  font-size: 13px;
  line-height: 1.45;
}

.pay-card p {
  margin: 10px 0 0;
  color: #6b6b80;
}

.benefits-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #56496f;
  display: grid;
  gap: 8px;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.state-card {
  min-height: 270px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
}

:global(.edit-profile-overlay) {
  position: fixed;
  inset: 0;
  z-index: 181;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(35, 21, 60, 0.36);
  backdrop-filter: blur(6px);
}

:global(.edit-profile-panel) {
  width: min(620px, 94vw);
  background: #fff;
  border-radius: 18px;
  border: 1px solid #ece7f8;
  box-shadow: var(--shadow-card);
  padding: 18px;
  display: grid;
  gap: 12px;
}

.edit-head h3 {
  margin: 0;
}

.edit-head p {
  margin: 6px 0 0;
  color: #6b6b80;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #4d4166;
  font-weight: 600;
  font-size: 13px;
}

.field input,
.field select {
  border: 1px solid #e1dcf7;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fbfaff;
}

.field input[aria-invalid='true'],
.field select[aria-invalid='true'] {
  border-color: rgba(239, 68, 68, 0.5);
  background: #fff6f6;
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
}

.field-full {
  grid-column: 1 / -1;
}

.edit-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

@media (max-width: 920px) {
  .confirm-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .confirm-onboarding {
    padding-top: 18px;
  }

  .confirm-hero,
  .confirm-card {
    padding: 16px;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .edit-grid {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }

  .edit-actions {
    flex-direction: column;
  }
}
</style>
