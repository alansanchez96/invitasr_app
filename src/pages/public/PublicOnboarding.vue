<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  completePublicOnboarding,
  getPublicOnboarding,
  type PublicOnboardingContext,
} from '@/services/onboardings'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>

type OnboardingForm = {
  name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
  template_id: string
}

const route = useRoute()
const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fieldErrors = ref<FieldErrors>({})
const context = ref<PublicOnboardingContext | null>(null)

const form = reactive<OnboardingForm>({
  name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
  template_id: '',
})

const onboardingCode = computed(() => String(route.params.code ?? '').trim())
const statusNormalized = computed(() => context.value?.status?.toString().toLowerCase() ?? '')
const hasTemplateOptions = computed(() => (context.value?.templates?.length ?? 0) > 0)
const isCompleted = computed(() => statusNormalized.value === 'completed')
const isCanceled = computed(() => ['canceled', 'cancelled'].includes(statusNormalized.value))
const canSubmit = computed(
  () => !isLoading.value && !isSubmitting.value && !loadError.value && !successMessage.value && !isCompleted.value && !isCanceled.value,
)

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const formatPaymentMode = (value?: string) => {
  if (!value || value === 'paid') return 'Pago'
  if (value === 'gift') return 'Regalo'
  return value
}

const parseErrorMessage = (error: unknown) => {
  const payload = error as { message?: string }
  return payload?.message?.trim() || 'No pudimos validar el codigo de onboarding.'
}

const pickDefaultTemplate = () => {
  if (form.template_id) return
  const templateId = context.value?.template_id
  if (templateId !== undefined && templateId !== null && String(templateId).trim()) {
    form.template_id = String(templateId)
    return
  }
  const firstTemplate = context.value?.templates?.[0]
  if (firstTemplate?.id !== undefined && firstTemplate.id !== null) {
    form.template_id = String(firstTemplate.id)
  }
}

const getFieldError = (key: string) => fieldErrors.value[key]?.[0] ?? ''

const validateForm = () => {
  const nextErrors: FieldErrors = {}

  if (!form.name.trim()) nextErrors.name = ['El nombre es obligatorio.']
  if (!form.last_name.trim()) nextErrors.last_name = ['El apellido es obligatorio.']
  if (!form.email.trim()) nextErrors.email = ['El correo es obligatorio.']
  if (!form.password) nextErrors.password = ['La contrasena es obligatoria.']
  if (!form.password_confirmation) {
    nextErrors.password_confirmation = ['Confirma la contrasena.']
  } else if (form.password !== form.password_confirmation) {
    nextErrors.password_confirmation = ['Las contrasenas no coinciden.']
  }
  if (!form.template_id.trim()) nextErrors.template_id = ['Selecciona una plantilla.']

  fieldErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const loadOnboarding = async () => {
  isLoading.value = true
  loadError.value = null
  fieldErrors.value = {}

  if (!onboardingCode.value) {
    loadError.value = 'El codigo de onboarding no es valido.'
    isLoading.value = false
    return
  }

  try {
    const payload = await getPublicOnboarding(onboardingCode.value)
    context.value = payload
    pickDefaultTemplate()
  } catch (error) {
    loadError.value = parseErrorMessage(error)
    notifyError(loadError.value)
  } finally {
    isLoading.value = false
  }
}

const submitOnboarding = async () => {
  fieldErrors.value = {}
  if (!validateForm()) {
    notifyWarning('Revisa los datos ingresados.')
    return
  }

  if (!onboardingCode.value) return
  isSubmitting.value = true
  try {
    const response = await completePublicOnboarding(onboardingCode.value, {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      password: form.password,
      password_confirmation: form.password_confirmation,
      template_id: form.template_id.trim(),
    })

    successMessage.value = response.message ?? 'Onboarding completado correctamente.'
    notifySuccess(successMessage.value)
  } catch (error) {
    const payload = error as { message?: string; errors?: FieldErrors; statusCode?: number }
    if (payload?.errors && Object.keys(payload.errors).length > 0) {
      fieldErrors.value = payload.errors
      notifyWarning('Hay datos para corregir antes de continuar.')
      return
    }
    notifyError(payload?.message ?? 'No pudimos completar el onboarding.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void loadOnboarding()
})
</script>

<template>
  <section class="section onboarding-section">
    <div class="container onboarding-container">
      <div class="onboarding-brand">
        <img src="/brand/logo-transparent.png" alt="InvitaSR" />
      </div>

      <article v-if="isLoading" class="onboarding-card onboarding-state" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <p>Cargando onboarding...</p>
      </article>

      <article v-else-if="loadError" class="onboarding-card onboarding-state error-state" role="alert">
        <h1>Onboarding no disponible</h1>
        <p>{{ loadError }}</p>
        <RouterLink class="btn btn-ghost" to="/">Volver al inicio</RouterLink>
      </article>

      <div v-else class="onboarding-grid">
        <aside class="onboarding-card onboarding-summary">
          <h2>Resumen</h2>
          <div class="summary-row">
            <span>Codigo</span>
            <strong>{{ context?.token_short_code ?? onboardingCode }}</strong>
          </div>
          <div class="summary-row">
            <span>Cliente</span>
            <strong>{{ context?.client_name ?? '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>Plan</span>
            <strong>{{ context?.plan_name ?? '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>Modo de pago</span>
            <strong>{{ formatPaymentMode(context?.payment_mode) }}</strong>
          </div>
          <div class="summary-row">
            <span>Vencimiento</span>
            <strong>{{ formatDateTime(context?.expires_at ?? context?.token_expire) }}</strong>
          </div>
        </aside>

        <article class="onboarding-card onboarding-form-card">
          <h1>Completa tu registro</h1>
          <p class="onboarding-lead">Configura el usuario administrador para activar tu cuenta.</p>

          <div v-if="successMessage" class="state-banner success">
            <strong>Cuenta creada</strong>
            <p>{{ successMessage }}</p>
          </div>
          <div v-else-if="isCompleted" class="state-banner neutral">
            <strong>Onboarding finalizado</strong>
            <p>Este enlace ya fue utilizado previamente.</p>
          </div>
          <div v-else-if="isCanceled" class="state-banner warning">
            <strong>Onboarding cancelado</strong>
            <p>Solicita un nuevo acceso desde el panel de backoffice.</p>
          </div>

          <form v-if="canSubmit" class="onboarding-form" @submit.prevent="submitOnboarding">
            <label class="field">
              <span>Nombre</span>
              <input
                v-model="form.name"
                type="text"
                autocomplete="given-name"
                :aria-invalid="Boolean(getFieldError('name'))"
              />
              <small v-if="getFieldError('name')" class="field-error">{{ getFieldError('name') }}</small>
            </label>

            <label class="field">
              <span>Apellido</span>
              <input
                v-model="form.last_name"
                type="text"
                autocomplete="family-name"
                :aria-invalid="Boolean(getFieldError('last_name'))"
              />
              <small v-if="getFieldError('last_name')" class="field-error">{{ getFieldError('last_name') }}</small>
            </label>

            <label class="field field-full">
              <span>Correo</span>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
                :aria-invalid="Boolean(getFieldError('email'))"
              />
              <small v-if="getFieldError('email')" class="field-error">{{ getFieldError('email') }}</small>
            </label>

            <label class="field">
              <span>Contrasena</span>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :aria-invalid="Boolean(getFieldError('password'))"
              />
              <small v-if="getFieldError('password')" class="field-error">{{ getFieldError('password') }}</small>
            </label>

            <label class="field">
              <span>Confirmar contrasena</span>
              <input
                v-model="form.password_confirmation"
                type="password"
                autocomplete="new-password"
                :aria-invalid="Boolean(getFieldError('password_confirmation'))"
              />
              <small v-if="getFieldError('password_confirmation')" class="field-error">
                {{ getFieldError('password_confirmation') }}
              </small>
            </label>

            <label class="field field-full">
              <span>Plantilla inicial</span>
              <select
                v-if="hasTemplateOptions"
                v-model="form.template_id"
                :aria-invalid="Boolean(getFieldError('template_id'))">
                <option value="">Selecciona una plantilla</option>
                <option
                  v-for="template in context?.templates ?? []"
                  :key="String(template.id ?? template.name)"
                  :value="String(template.id ?? '')">
                  {{ template.name }}
                </option>
              </select>
              <input
                v-else
                v-model="form.template_id"
                type="number"
                min="1"
                placeholder="ID de plantilla"
                :aria-invalid="Boolean(getFieldError('template_id'))"
              />
              <small v-if="getFieldError('template_id')" class="field-error">{{ getFieldError('template_id') }}</small>
            </label>

            <button class="btn btn-primary submit-btn" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
              <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
              <span>{{ isSubmitting ? 'Creando cuenta...' : 'Completar onboarding' }}</span>
            </button>
          </form>

          <div class="onboarding-actions">
            <RouterLink class="btn btn-ghost" to="/">Volver al inicio</RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.onboarding-section {
  padding-top: 38px;
}

.onboarding-container {
  width: min(1120px, 94vw);
  display: grid;
  gap: 16px;
}

.onboarding-brand {
  display: flex;
  justify-content: center;
}

.onboarding-brand img {
  width: min(220px, 48vw);
  object-fit: contain;
}

.onboarding-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.onboarding-card {
  background: #fff;
  border: 1px solid #e6e8f0;
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

.onboarding-summary,
.onboarding-form-card {
  padding: 20px;
}

.onboarding-summary h2 {
  margin: 0 0 14px;
}

.summary-row {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid #f0ecfa;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row span {
  font-size: 12px;
  font-weight: 700;
  color: #6b6b80;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-row strong {
  color: #1f2937;
  font-size: 14px;
}

.onboarding-form-card h1 {
  margin: 0;
}

.onboarding-lead {
  margin: 8px 0 18px;
  color: #6b6b80;
}

.onboarding-form {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  color: #4b5563;
  font-weight: 600;
}

.field input,
.field select {
  border-radius: 12px;
  border: 1px solid #e2ddf7;
  padding: 11px 12px;
  background: #fbfaff;
}

.field input[aria-invalid='true'],
.field select[aria-invalid='true'] {
  border-color: rgba(239, 68, 68, 0.45);
  background: #fff5f5;
}

.field-full {
  grid-column: 1 / -1;
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
}

.submit-btn {
  grid-column: 1 / -1;
  gap: 8px;
}

.submit-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.state-banner {
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 12px;
  margin-bottom: 14px;
}

.state-banner strong {
  display: block;
  margin-bottom: 4px;
}

.state-banner p {
  margin: 0;
  color: #4b5563;
}

.state-banner.success {
  background: #f0fdf6;
  border-color: rgba(16, 185, 129, 0.25);
}

.state-banner.warning {
  background: #fff8ed;
  border-color: rgba(245, 158, 11, 0.3);
}

.state-banner.neutral {
  background: #f6f4ff;
  border-color: rgba(122, 79, 217, 0.24);
}

.onboarding-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-start;
}

.onboarding-state {
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 20px;
}

.error-state h1 {
  margin: 0;
}

@media (max-width: 900px) {
  .onboarding-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .onboarding-section {
    padding-top: 20px;
  }

  .onboarding-summary,
  .onboarding-form-card {
    padding: 16px;
  }

  .onboarding-form {
    grid-template-columns: 1fr;
  }

  .field-full,
  .submit-btn {
    grid-column: auto;
  }
}
</style>
