<script setup lang="ts">
import { reactive, ref } from 'vue'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import { requestPasswordReset } from '@/services/auth'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>
type AuthMode = 'login' | 'forgot'
type ProviderKey = 'email' | 'google' | 'facebook'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    errorMessage?: string | null
    fieldErrors?: FieldErrors
  }>(),
  {
    loading: false,
    errorMessage: null,
    fieldErrors: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'login', payload: { email: string; password: string; remember: boolean }): void
  (event: 'mode-change', mode: AuthMode): void
}>()

const mode = ref<AuthMode>('login')
const isSubmitting = ref(false)
const localErrors = ref<FieldErrors>({})
const emailSent = ref(false)

const forgotForm = reactive({
  email: '',
})

const getLocalError = (field: string) => localErrors.value[field]?.[0] ?? ''

const setMode = (nextMode: AuthMode) => {
  mode.value = nextMode
  localErrors.value = {}
  emailSent.value = false
  emit('mode-change', nextMode)
}

const handleProvider = (provider: ProviderKey) => {
  if (provider === 'email') {
    setMode('login')
    return
  }

  notifyWarning(`${provider === 'google' ? 'Google' : 'Facebook'} estará disponible al conectar el acceso social en producción.`)
}

const submitForgot = async () => {
  localErrors.value = {}

  if (!forgotForm.email.trim()) {
    localErrors.value = { email: ['Ingresa el correo de tu cuenta.'] }
    notifyWarning('Ingresa el correo de tu cuenta.')
    return
  }

  isSubmitting.value = true
  try {
    const response = await requestPasswordReset({ email: forgotForm.email.trim() })
    emailSent.value = true
    notifySuccess(response.message)
  } catch (error) {
    const payload = error as { message?: string; errors?: FieldErrors }
    localErrors.value = payload.errors ?? {}
    notifyError(payload.message ?? 'No pudimos enviar el enlace.')
  } finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <div class="auth-access-panel">
    <AuthForm
      v-if="mode === 'login'"
      :loading="props.loading"
      :error-message="props.errorMessage"
      :field-errors="props.fieldErrors"
      @forgot="setMode('forgot')"
      @submit="emit('login', $event)" />

    <form v-else class="auth-form" @submit.prevent="submitForgot">
      <div class="auth-panel-head">
        <h4>Recupera tu acceso</h4>
        <p>Te enviaremos un enlace seguro para crear una nueva contraseña.</p>
      </div>

      <label class="auth-field">
        <span>Correo</span>
        <input
          v-model="forgotForm.email"
          type="email"
          placeholder="tu@email.com"
          autocomplete="email"
          :aria-invalid="Boolean(getLocalError('email'))" />
        <span v-if="getLocalError('email')" class="auth-error" role="alert">{{ getLocalError('email') }}</span>
      </label>

      <button class="auth-panel-submit" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
        {{ isSubmitting ? 'Enviando...' : 'Enviar enlace' }}
      </button>

      <p v-if="emailSent" class="auth-panel-note" role="status">
        Te enviamos las instrucciones. Revisa tu correo en unos minutos.
      </p>

      <button class="auth-panel-link" type="button" @click="setMode('login')">Volver a iniciar sesion</button>
    </form>

    <div class="auth-divider"></div>
    <AuthProviders :providers="['google', 'facebook']" variant="column" @select="handleProvider" />
  </div>
</template>

<style scoped>
.auth-access-panel {
  display: grid;
  gap: 12px;
}

.auth-panel-head {
  display: grid;
  gap: 4px;
  text-align: center;
}

.auth-panel-head h4,
.auth-panel-head p {
  margin: 0;
}

.auth-panel-head h4 {
  color: var(--brand-ink);
  font-size: 18px;
}

.auth-panel-head p,
.auth-panel-note {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.auth-panel-submit {
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: var(--gradient-brand);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
}

.auth-panel-submit:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.auth-panel-note {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(122, 79, 217, 0.08);
}

.auth-panel-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--brand-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.auth-panel-link:hover,
.auth-panel-link:focus-visible {
  color: #7a4fd9;
}
</style>
