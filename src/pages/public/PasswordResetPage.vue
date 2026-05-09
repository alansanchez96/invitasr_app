<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { resetPassword } from '@/services/auth'
import { notifyError, notifySuccess, notifyWarning } from '@/utils/toast'

type FieldErrors = Record<string, string[]>

const route = useRoute()
const router = useRouter()
const isSubmitting = ref(false)
const fieldErrors = ref<FieldErrors>({})

const email = computed(() => String(route.query.email ?? '').trim())
const token = computed(() => String(route.query.token ?? '').trim())
const isLinkReady = computed(() => email.value !== '' && token.value !== '')

const form = reactive({
  password: '',
  password_confirmation: '',
})

const getFieldError = (field: string) => fieldErrors.value[field]?.[0] ?? ''

const submitReset = async () => {
  fieldErrors.value = {}

  if (!isLinkReady.value) {
    notifyWarning('El enlace no es valido. Solicita uno nuevo.')
    return
  }

  if (!form.password || !form.password_confirmation) {
    fieldErrors.value = { password: ['Completa la nueva contrasena.'] }
    notifyWarning('Completa la nueva contrasena.')
    return
  }

  if (form.password !== form.password_confirmation) {
    fieldErrors.value = { password_confirmation: ['Las contrasenas no coinciden.'] }
    notifyWarning('Las contrasenas no coinciden.')
    return
  }

  isSubmitting.value = true
  try {
    const response = await resetPassword({
      email: email.value,
      token: token.value,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    notifySuccess(response.message)
    await router.push('/')
  } catch (error) {
    const payload = error as { message?: string; errors?: FieldErrors }
    fieldErrors.value = payload.errors ?? {}
    notifyError(payload.message ?? 'No pudimos actualizar tu contrasena.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="reset-page">
    <section class="reset-card">
      <RouterLink class="reset-brand" to="/" aria-label="Volver al inicio">
        <img src="/brand/logo-transparent.png" alt="InvitaSR" />
      </RouterLink>

      <div class="reset-copy">
        <span class="reset-kicker">Acceso a tu cuenta</span>
        <h1>Crea una nueva contraseña</h1>
        <p>Elige una clave segura para volver a tu cuenta y continuar con tu invitación.</p>
      </div>

      <form v-if="isLinkReady" class="reset-form" @submit.prevent="submitReset">
        <label class="reset-field">
          <span>Correo</span>
          <input :value="email" type="email" disabled />
        </label>

        <label class="reset-field">
          <span>Nueva contraseña</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            placeholder="Mínimo 8 caracteres"
            :aria-invalid="Boolean(getFieldError('password'))" />
          <small v-if="getFieldError('password')" class="field-error">{{ getFieldError('password') }}</small>
        </label>

        <label class="reset-field">
          <span>Repite la contraseña</span>
          <input
            v-model="form.password_confirmation"
            type="password"
            autocomplete="new-password"
            placeholder="Repite tu nueva contraseña"
            :aria-invalid="Boolean(getFieldError('password_confirmation'))" />
          <small v-if="getFieldError('password_confirmation')" class="field-error">
            {{ getFieldError('password_confirmation') }}
          </small>
        </label>

        <button class="reset-submit" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
          {{ isSubmitting ? 'Actualizando...' : 'Actualizar contraseña' }}
        </button>
      </form>

      <div v-else class="reset-invalid">
        <p>Este enlace no es válido o está incompleto.</p>
        <RouterLink to="/">Volver a iniciar sesión</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.reset-page {
  min-height: calc(100svh - 76px);
  display: grid;
  place-items: center;
  padding: 116px 20px 48px;
  background:
    radial-gradient(circle at 10% 8%, rgba(155, 107, 255, 0.18), transparent 32%),
    radial-gradient(circle at 92% 12%, rgba(240, 106, 166, 0.16), transparent 30%),
    linear-gradient(180deg, #fff 0%, #fbf7ff 100%);
}

.reset-card {
  width: min(100%, 520px);
  display: grid;
  gap: 22px;
  padding: 28px;
  border: 1px solid rgba(226, 218, 247, 0.92);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 28px 64px rgba(90, 48, 140, 0.14);
  backdrop-filter: blur(10px);
}

.reset-brand {
  width: 128px;
  display: inline-flex;
}

.reset-brand img {
  width: 100%;
  height: auto;
}

.reset-copy {
  display: grid;
  gap: 8px;
}

.reset-kicker {
  color: #7a4fd9;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.reset-copy h1 {
  margin: 0;
  color: #211436;
  font-size: clamp(30px, 5vw, 42px);
  line-height: 0.98;
  letter-spacing: -0.05em;
}

.reset-copy p,
.reset-invalid p {
  margin: 0;
  color: #6d5d87;
  line-height: 1.55;
}

.reset-form {
  display: grid;
  gap: 14px;
}

.reset-field {
  display: grid;
  gap: 7px;
  color: #34224f;
  font-size: 13px;
  font-weight: 700;
}

.reset-field input {
  width: 100%;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid rgba(155, 107, 255, 0.24);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.92);
  color: #211436;
  font: inherit;
  font-weight: 500;
}

.reset-field input:disabled {
  color: #6d5d87;
  background: #f5f0ff;
}

.reset-field input[aria-invalid='true'] {
  border-color: rgba(220, 38, 38, 0.55);
  background: #fff7f7;
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
}

.reset-submit {
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(120deg, #7a4fd9, #f06aa6);
  color: #fff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(122, 79, 217, 0.22);
}

.reset-submit:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.reset-invalid {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(122, 79, 217, 0.08);
}

.reset-invalid a {
  color: #6e48c4;
  font-weight: 800;
  text-decoration: none;
}

.reset-invalid a:hover,
.reset-invalid a:focus-visible {
  text-decoration: underline;
}

@media (max-width: 560px) {
  .reset-page {
    padding: 96px 12px 32px;
    place-items: start center;
  }

  .reset-card {
    padding: 20px;
    border-radius: 22px;
  }
}
</style>
