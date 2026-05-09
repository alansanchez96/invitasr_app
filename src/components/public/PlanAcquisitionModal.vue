<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import { registerPublicOnboarding, type PublicOnboardingRegistrationInput } from '@/services/publicOnboarding'
import { useCatalogStore } from '@/stores/catalogs'
import { useSessionStore } from '@/stores/session'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>
type RegisterProvider = 'email' | 'google' | 'facebook'

type PlanSelection = {
  id?: number | string
  name?: string
  price_usd?: number | string | null
  billing_type?: string
}

const props = defineProps<{
  modelValue: boolean
  plan: PlanSelection | null
  showDecisionStep?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'registered'): void
}>()

const session = useSessionStore()
const catalogStore = useCatalogStore()
const router = useRouter()
const { countries } = storeToRefs(catalogStore)
const mode = ref<'decision' | 'register' | 'email'>('decision')
const isSubmitting = ref(false)
const fieldErrors = ref<FieldErrors>({})

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  country_code: 'AR',
})

const DRAFT_KEY = 'public_onboarding_draft'
const DEMO_PUBLICATION_KEY = 'invitasr.demo-publication'
const planNameKey = computed(() => String(props.plan?.name ?? '').trim().toLowerCase())

const formatPlanPrice = (value?: number | string | null) => {
  const amount = Number(value ?? 0)
  return `US$ ${amount.toFixed(2)}`
}

const close = () => {
  emit('update:modelValue', false)
}

const goToDemo = () => {
  const query = planNameKey.value ? { plan: planNameKey.value } : undefined
  close()
  router.push({ name: 'demo', query })
}

const getFieldError = (field: string) => fieldErrors.value[field]?.[0] ?? ''

const handleSocialProvider = (provider: RegisterProvider) => {
  if (provider === 'email') {
    mode.value = 'email'
    return
  }

  notifyWarning(`${provider === 'google' ? 'Google' : 'Facebook'} estará disponible al conectar el acceso social en producción.`)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    mode.value = props.showDecisionStep === false ? 'register' : 'decision'
    fieldErrors.value = {}
    void catalogStore.ensureCountries().catch(() => {
      notifyWarning('No pudimos cargar el catalogo de paises.')
    })
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

const validateForm = () => {
  const nextErrors: FieldErrors = {}
  if (!form.full_name.trim()) nextErrors.full_name = ['Ingresa tu nombre completo.']
  if (!form.email.trim()) nextErrors.email = ['Ingresa un correo valido.']
  if (!form.password.trim()) nextErrors.password = ['Ingresa una contrasena segura.']
  if (!form.country_code.trim()) nextErrors.country_code = ['Selecciona tu pais de residencia.']
  fieldErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const loadPublishedDemoRef = (): { userPath?: string; slug?: string } | null => {
  try {
    const raw = sessionStorage.getItem(DEMO_PUBLICATION_KEY)
    return raw ? JSON.parse(raw) as { userPath?: string; slug?: string } : null
  } catch {
    return null
  }
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

  const demoRef = loadPublishedDemoRef()
  if (demoRef?.userPath && demoRef?.slug) {
    payload.demo_user_path = demoRef.userPath
    payload.demo_slug = demoRef.slug
  }

  isSubmitting.value = true
  try {
    const response = await registerPublicOnboarding(payload)
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    if (response.user) {
      session.acceptSession(response.session?.token ?? null, response.user, false)
    } else {
      await session.refreshMe()
    }
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
  <BaseModal :model-value="props.modelValue" overlay-class="plan-acq-overlay" panel-class="plan-acq-panel"
    aria-label="Activar plan" @update:model-value="emit('update:modelValue', $event)">
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
      <article class="decision-card">
        <span class="decision-badge">Ideal si quieres mirar primero</span>
        <h4>Probar una plantilla gratis</h4>
        <p>Explora cómo se verá tu invitación, prueba estilos reales y decide con más confianza antes de pagar.</p>
        <button type="button" class="btn btn-ghost" @click="goToDemo">Probar gratis</button>
      </article>

      <article class="decision-card featured">
        <span class="decision-badge">Para avanzar ahora</span>
        <h4>Comprar este plan</h4>
        <p>Crea tu cuenta y continúa al pago seguro para empezar a personalizar tu invitación.</p>
        <button type="button" class="btn btn-primary" @click="mode = 'register'">Comprar este plan</button>
      </article>
    </section>

    <section v-else-if="mode === 'register'" class="register-choice-section">
      <header class="section-title">
        <span class="modal-kicker">Crea tu cuenta</span>
        <h4>Elige cómo quieres continuar</h4>
        <p>Reserva este plan y completa el pago seguro en el siguiente paso.</p>
      </header>

      <AuthProviders :providers="['google', 'facebook', 'email']" variant="inline" @select="handleSocialProvider" />

      <button v-if="props.showDecisionStep !== false" type="button" class="choice-back" @click="mode = 'decision'">
        Volver a opciones
      </button>
    </section>

    <section v-else class="email-section">
      <header class="email-title">
        <button type="button" class="icon-back" aria-label="Volver a opciones de registro" title="Volver"
          @click="mode = 'register'">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        <div>
          <h4>Crea tu cuenta con email</h4>
          <p>Despues podras revisar tus datos y completar el pago en una pasarela segura.</p>
        </div>
      </header>

      <form class="register-grid" @submit.prevent="submitRegister">
        <label class="field field-full">
          <span>Nombre completo</span>
          <input v-model="form.full_name" type="text" autocomplete="name"
            :aria-invalid="Boolean(getFieldError('full_name'))" />
          <small v-if="getFieldError('full_name')" class="field-error">{{ getFieldError('full_name') }}</small>
        </label>

        <label class="field field-full">
          <span>Correo</span>
          <input v-model="form.email" type="email" autocomplete="email"
            :aria-invalid="Boolean(getFieldError('email'))" />
          <small v-if="getFieldError('email')" class="field-error">{{ getFieldError('email') }}</small>
        </label>

        <label class="field">
          <span>Contrasena</span>
          <input v-model="form.password" type="password" autocomplete="new-password"
            :aria-invalid="Boolean(getFieldError('password'))" />
          <small v-if="getFieldError('password')" class="field-error">{{ getFieldError('password') }}</small>
        </label>

        <label class="field">
          <span>Pais de residencia</span>
          <select v-model="form.country_code" :aria-invalid="Boolean(getFieldError('country_code'))">
            <option value="">Selecciona un pais</option>
            <option v-for="country in countries" :key="country.iso ?? country.id" :value="country.iso">
              {{ country.nicename ?? country.name }}
            </option>
          </select>
          <small v-if="getFieldError('country_code')" class="field-error">{{ getFieldError('country_code') }}</small>
        </label>

        <footer class="modal-actions field-full">
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

.decision-card.featured {
  border-color: rgba(122, 79, 217, 0.45);
  background: linear-gradient(160deg, #fbf8ff, #fff4fb);
}

.decision-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(122, 79, 217, 0.1);
  color: #6e48c4;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.email-section h4 {
  margin: 0;
}

.email-section p {
  margin: 6px 0 0;
  color: #6b6b80;
}

.register-choice-section {
  display: grid;
  gap: 16px;
  max-width: 460px;
  width: 100%;
  margin: 0 auto;
}

.section-title {
  display: grid;
  gap: 6px;
  text-align: center;
}

.section-title h4 {
  margin: 0;
  color: #20143d;
  font-size: 24px;
  line-height: 1.12;
}

.section-title p {
  margin: 0;
  color: #6b6b80;
  font-size: 14px;
  line-height: 1.45;
}

.register-choice-section :deep(.auth-providers--inline) {
  grid-template-columns: 1fr;
  gap: 10px;
}

.register-choice-section :deep(.auth-provider) {
  min-height: 50px;
  border-radius: 14px;
}

.choice-back {
  justify-self: center;
  border: 0;
  background: transparent;
  color: #6e48c4;
  font-weight: 800;
  cursor: pointer;
}

.choice-back:hover,
.choice-back:focus-visible {
  color: #4e3684;
  text-decoration: underline;
}

.email-title {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
}

.icon-back {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(155, 107, 255, 0.26);
  border-radius: 13px;
  display: inline-grid;
  place-items: center;
  background: linear-gradient(145deg, #fff, #f8f2ff);
  color: #6e48c4;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(90, 48, 140, 0.08);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.icon-back:hover,
.icon-back:focus-visible {
  transform: translateX(-2px);
  border-color: rgba(155, 107, 255, 0.55);
  box-shadow: 0 14px 28px rgba(90, 48, 140, 0.14);
}

.icon-back svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.register-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.social-register {
  margin-top: 14px;
  display: grid;
  gap: 9px;
  border: 1px solid rgba(226, 218, 247, 0.95);
  border-radius: 14px;
  padding: 12px;
  background: linear-gradient(145deg, #fff, #fbf7ff);
}

.social-register-title {
  color: #4d4166;
  font-size: 13px;
  font-weight: 800;
}

.social-register p {
  margin: 0;
  color: #7a6f94;
  font-size: 12px;
  line-height: 1.45;
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
  width: 100%;
  min-width: 0;
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
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

@media (max-width: 760px) {
  :global(.plan-acq-overlay) {
    place-items: start center;
    padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  :global(.plan-acq-panel) {
    width: min(100%, 520px);
    max-height: calc(100svh - 24px);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 20px;
    padding: 16px;
    gap: 12px;
  }

  .modal-close {
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
  }

  .modal-head {
    padding: 14px 48px 14px 14px;
    border-radius: 14px;
  }

  .modal-head h3 {
    font-size: 21px;
    line-height: 1.1;
  }

  .modal-promise {
    font-size: 12px;
  }

  .decision-grid {
    grid-template-columns: 1fr;
  }

  .decision-card {
    padding: 13px;
  }

  .decision-card .btn,
  .modal-actions .btn {
    width: 100%;
  }

  .email-section h4 {
    font-size: 21px;
    line-height: 1.15;
  }

  .register-choice-section {
    max-width: none;
    gap: 14px;
  }

  .section-title {
    text-align: left;
  }

  .section-title h4 {
    font-size: 21px;
  }

  .register-choice-section :deep(.auth-provider) {
    min-height: 48px;
  }

  .email-title {
    gap: 10px;
  }

  .icon-back {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }

  .social-register {
    margin-top: 12px;
    padding: 11px;
    border-radius: 13px;
  }

  .social-register :deep(.auth-providers--inline) {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .social-register :deep(.auth-provider) {
    width: 100%;
    min-height: 44px;
    box-shadow: none;
  }

  .register-grid {
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .field-full {
    grid-column: auto;
  }

  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}

@media (max-width: 420px) {
  :global(.plan-acq-overlay) {
    padding-inline: 8px;
  }

  :global(.plan-acq-panel) {
    border-radius: 18px;
    padding: 14px;
  }
}
</style>
