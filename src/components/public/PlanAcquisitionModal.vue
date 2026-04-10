<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { registerPublicOnboarding, type PublicOnboardingRegistrationInput } from '@/services/publicOnboarding'
import { useSessionStore } from '@/stores/session'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>
type Provider = 'email' | 'google' | 'facebook'

type PlanSelection = {
  id?: number | string
  name?: string
  price_usd?: number | string | null
  billing_type?: string
}

const props = defineProps<{
  modelValue: boolean
  plan: PlanSelection | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'registered'): void
}>()

const session = useSessionStore()
const mode = ref<'decision' | 'providers' | 'email'>('decision')
const isSubmitting = ref(false)
const fieldErrors = ref<FieldErrors>({})

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  country_code: 'AR',
})

const COUNTRIES = [
  { code: 'AR', label: 'Argentina' },
  { code: 'BO', label: 'Bolivia' },
  { code: 'BR', label: 'Brasil' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'EC', label: 'Ecuador' },
  { code: 'ES', label: 'Espana' },
  { code: 'MX', label: 'Mexico' },
  { code: 'PE', label: 'Peru' },
  { code: 'PY', label: 'Paraguay' },
  { code: 'UY', label: 'Uruguay' },
]

const DRAFT_KEY = 'public_onboarding_draft'

const formatPlanPrice = (value?: number | string | null) => {
  const amount = Number(value ?? 0)
  return `US$ ${amount.toFixed(2)}`
}

const close = () => {
  emit('update:modelValue', false)
}

const getFieldError = (field: string) => fieldErrors.value[field]?.[0] ?? ''

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    mode.value = 'decision'
    fieldErrors.value = {}
  },
)

watch(
  () => props.modelValue,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

const handleProviderSelect = (provider: Provider) => {
  if (provider === 'email') {
    mode.value = 'email'
    return
  }
  notifyWarning('Google y Facebook estaran habilitados en una siguiente iteracion.')
}

const validateForm = () => {
  const nextErrors: FieldErrors = {}
  if (!form.full_name.trim()) nextErrors.full_name = ['Ingresa tu nombre completo.']
  if (!form.email.trim()) nextErrors.email = ['Ingresa un correo valido.']
  if (!form.password.trim()) nextErrors.password = ['Ingresa una contrasena segura.']
  if (!form.country_code.trim()) nextErrors.country_code = ['Selecciona tu pais de residencia.']
  fieldErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const submitRegister = async () => {
  const planId = props.plan?.id
  if (!props.plan || planId === undefined || planId === null) {
    notifyWarning('Selecciona un plan para continuar.')
    return
  }

  fieldErrors.value = {}
  if (!validateForm()) {
    notifyWarning('Completa los datos obligatorios para continuar.')
    return
  }

  const payload: PublicOnboardingRegistrationInput = {
    plan_id: planId,
    template_id: null,
    register_method: 'email',
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    password: form.password,
    country_code: form.country_code.trim(),
  }

  isSubmitting.value = true
  try {
    const response = await registerPublicOnboarding(payload)
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    await session.refreshMe()
    notifySuccess(response.message)
    emit('registered')
    close()
  } catch (error) {
    const payloadError = error as { message?: string; errors?: FieldErrors }
    if (payloadError?.errors && Object.keys(payloadError.errors).length > 0) {
      fieldErrors.value = payloadError.errors
      notifyWarning('Revisa los datos ingresados.')
      return
    }
    notifyError(payloadError?.message ?? 'No pudimos registrar tu cuenta.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    overlay-class="plan-acq-overlay"
    panel-class="plan-acq-panel"
    aria-label="Activar plan"
    @update:model-value="emit('update:modelValue', $event)">
    <button class="modal-close" type="button" aria-label="Cerrar modal" @click="close">&times;</button>

    <header class="modal-head">
      <span class="modal-kicker">Plan seleccionado</span>
      <h3>{{ props.plan?.name ?? 'Plan' }}</h3>
      <p>
        {{ props.plan ? formatPlanPrice(props.plan.price_usd) : '' }}
        ·
        {{ props.plan?.billing_type === 'subscription' ? 'Suscripcion' : 'Pago unico' }}
      </p>
      <strong class="modal-promise">Activa tu cuenta hoy y publica sin esperas.</strong>
    </header>

    <section v-if="mode === 'decision'" class="decision-grid">
      <article class="decision-card disabled" aria-disabled="true">
        <h4>1. Probar tipo de evento e invitacion</h4>
        <p>Explorar plantillas sera el siguiente upgrade. Te avisaremos apenas este disponible.</p>
        <button type="button" class="btn btn-ghost" disabled>Proximamente</button>
      </article>

      <article class="decision-card featured">
        <h4>2. Quiero activar mi plan ahora</h4>
        <p>Tu cuenta se crea en minutos y quedas listo para personalizar tu invitacion.</p>
        <button type="button" class="btn btn-primary" @click="mode = 'providers'">Continuar con mi plan</button>
      </article>
    </section>

    <section v-else-if="mode === 'providers'" class="providers-section">
      <h4>Elige como crear tu cuenta</h4>
      <p>Un solo acceso para tu plan, tus pagos y tu panel de invitaciones.</p>

      <div class="provider-grid">
        <button type="button" class="provider-btn is-active" @click="handleProviderSelect('email')">
          <span class="provider-title">Continuar con Email</span>
          <small class="provider-note">Disponible ahora</small>
        </button>
        <button type="button" class="provider-btn is-disabled" disabled @click="handleProviderSelect('google')">
          <span class="provider-title">Google</span>
          <small class="provider-note">Proximamente</small>
        </button>
        <button type="button" class="provider-btn is-disabled" disabled @click="handleProviderSelect('facebook')">
          <span class="provider-title">Facebook</span>
          <small class="provider-note">Proximamente</small>
        </button>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn btn-ghost" @click="mode = 'decision'">Volver</button>
      </footer>
    </section>

    <section v-else class="email-section">
      <h4>Crea tu cuenta para reservar este plan</h4>
      <p>Despues podras revisar tus datos y completar el pago en una pasarela segura.</p>

      <form class="register-grid" @submit.prevent="submitRegister">
        <label class="field field-full">
          <span>Nombre completo</span>
          <input v-model="form.full_name" type="text" autocomplete="name" :aria-invalid="Boolean(getFieldError('full_name'))" />
          <small v-if="getFieldError('full_name')" class="field-error">{{ getFieldError('full_name') }}</small>
        </label>

        <label class="field field-full">
          <span>Correo</span>
          <input v-model="form.email" type="email" autocomplete="email" :aria-invalid="Boolean(getFieldError('email'))" />
          <small v-if="getFieldError('email')" class="field-error">{{ getFieldError('email') }}</small>
        </label>

        <label class="field">
          <span>Contrasena</span>
          <input v-model="form.password" type="password" autocomplete="new-password" :aria-invalid="Boolean(getFieldError('password'))" />
          <small v-if="getFieldError('password')" class="field-error">{{ getFieldError('password') }}</small>
        </label>

        <label class="field">
          <span>Pais de residencia</span>
          <select v-model="form.country_code" :aria-invalid="Boolean(getFieldError('country_code'))">
            <option value="">Selecciona un pais</option>
            <option v-for="country in COUNTRIES" :key="country.code" :value="country.code">{{ country.label }}</option>
          </select>
          <small v-if="getFieldError('country_code')" class="field-error">{{ getFieldError('country_code') }}</small>
        </label>

        <footer class="modal-actions field-full">
          <button type="button" class="btn btn-ghost" @click="mode = 'providers'">Volver</button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting" :aria-busy="isSubmitting">
            {{ isSubmitting ? 'Creando cuenta...' : 'Continuar y revisar datos' }}
          </button>
        </footer>
      </form>
    </section>
  </BaseModal>
</template>

<style scoped>
:global(.plan-acq-overlay) {
  position: fixed;
  inset: 0;
  z-index: 180;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(245, 240, 255, 0.76);
  backdrop-filter: blur(8px);
}

:global(.plan-acq-panel) {
  width: min(760px, 95vw);
  background: #fff;
  border: 1px solid rgba(233, 220, 255, 0.75);
  border-radius: 24px;
  padding: 20px;
  display: grid;
  gap: 14px;
  box-shadow: 0 22px 48px rgba(90, 48, 140, 0.2);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #e2ddf7;
  background: #fff;
  color: #7a4fd9;
  font-size: 14px;
  cursor: pointer;
}

.modal-head {
  border: 1px solid #ece7f8;
  background: linear-gradient(140deg, #fff, #f8f2ff);
  border-radius: 16px;
  padding: 12px;
}

.modal-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #7a4fd9;
  font-weight: 700;
}

.modal-head h3 {
  margin: 4px 0;
}

.modal-head p {
  margin: 0;
  color: #6b6b80;
}

.modal-promise {
  display: block;
  margin-top: 10px;
  color: #4e3684;
  font-size: 13px;
}

.decision-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.decision-card {
  border: 1px solid #e8dffb;
  border-radius: 14px;
  background: #fbfaff;
  padding: 14px;
  display: grid;
  gap: 10px;
}

.decision-card h4 {
  margin: 0;
}

.decision-card p {
  margin: 0;
  color: #6b6b80;
  font-size: 13px;
  line-height: 1.45;
}

.decision-card.disabled {
  opacity: 0.65;
}

.decision-card.featured {
  border-color: rgba(122, 79, 217, 0.45);
  background: linear-gradient(160deg, #fbf8ff, #fff4fb);
}

.providers-section h4,
.email-section h4 {
  margin: 0;
}

.providers-section p,
.email-section p {
  margin: 6px 0 0;
  color: #6b6b80;
}

.provider-grid {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.provider-btn {
  border: 1px solid #e2ddf7;
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  font-weight: 600;
  color: #4c3f67;
  text-align: left;
  display: grid;
  gap: 4px;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.provider-btn:not(:disabled):hover {
  border-color: rgba(122, 79, 217, 0.45);
  background: #f8f3ff;
  transform: translateY(-1px);
}

.provider-btn.is-active {
  border-color: rgba(122, 79, 217, 0.48);
  color: #502d9c;
  background: linear-gradient(145deg, #f6eeff, #fff);
}

.provider-title {
  font-size: 14px;
}

.provider-note {
  font-size: 12px;
  color: #7a6f94;
  font-weight: 600;
}

.provider-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 5px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: #4d4166;
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

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

@media (max-width: 760px) {
  .decision-grid {
    grid-template-columns: 1fr;
  }

  .register-grid {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }

  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
