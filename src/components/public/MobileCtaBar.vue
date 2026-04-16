<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthForm from '@/components/auth/AuthForm.vue'
import AuthProviders from '@/components/auth/AuthProviders.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const router = useRouter()
const session = useSessionStore()
const isAuthenticated = computed(() => session.isAuthenticated)
const isMaster = computed(() => session.isMaster)
const hasActiveClientPlan = computed(() => session.hasActiveClientPlan)
const isLoginLoading = computed(() => session.isLoading)
const isLoginOpen = ref(false)
const loginError = ref<string | null>(null)
const loginFieldErrors = ref<Record<string, string[]>>({})
const clientEntryPath = computed(() =>
  session.isMaster ? '/backoffice' : session.hasActiveClientPlan ? '/panel' : '/onboarding/public',
)
const clientEntryLabel = computed(() =>
  hasActiveClientPlan.value ? 'Ir a mi panel' : 'Finalizar compra',
)

const openLogin = () => {
  loginError.value = null
  loginFieldErrors.value = {}
  isLoginOpen.value = true
}

const closeLogin = () => {
  isLoginOpen.value = false
  loginError.value = null
  loginFieldErrors.value = {}
}

const handleLoginSubmit = async (payload: { email: string; password: string; remember: boolean }) => {
  loginError.value = null
  loginFieldErrors.value = {}
  const result = await session.login(payload.email, payload.password, payload.remember)
  if (!result.ok) {
    loginError.value = result.message ?? 'No pudimos iniciar sesion.'
    loginFieldErrors.value = result.fieldErrors ?? {}
    return
  }
  closeLogin()
  await router.push(clientEntryPath.value)
}

const handleLogout = () => {
  session.logout().finally(() => {
    router.push('/')
  })
}
</script>

<template>
  <div class="mobile-cta-bar">
    <div class="container mobile-cta-wrap">
      <div v-if="!isAuthenticated" class="mobile-cta-inner">
        <BaseButton variant="ghost" type="button" @click="openLogin">Iniciar sesion</BaseButton>
        <BaseButton as="RouterLink" variant="primary" to="/planes">Ver planes</BaseButton>
      </div>

      <div v-else-if="isMaster" class="mobile-cta-inner">
        <BaseButton as="RouterLink" variant="primary" to="/backoffice">Ir a backoffice</BaseButton>
        <BaseButton variant="ghost" type="button" @click="handleLogout">Cerrar sesion</BaseButton>
      </div>

      <div v-else class="mobile-cta-inner">
        <BaseButton as="RouterLink" variant="primary" :to="clientEntryPath">{{ clientEntryLabel }}</BaseButton>
        <BaseButton variant="ghost" type="button" @click="handleLogout">Cerrar sesion</BaseButton>
      </div>
    </div>

    <BaseModal
      v-model="isLoginOpen"
      overlay-class="mobile-login-overlay"
      panel-class="mobile-login-panel"
      aria-label="Iniciar sesion"
      @close="closeLogin">
      <div class="mobile-login-head">
        <img class="mobile-login-brand" src="/brand/logo_icon.png" alt="InvitaSR" />
        <h3>Inicia sesion</h3>
        <p>Accede a tu cuenta y continua donde quedaste.</p>
      </div>

      <div class="mobile-login-body">
        <AuthForm
          :loading="isLoginLoading"
          :error-message="loginError"
          :field-errors="loginFieldErrors"
          @submit="handleLoginSubmit" />
        <div class="mobile-login-divider"></div>
        <AuthProviders :providers="['google', 'facebook']" />
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.mobile-cta-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 0 0 calc(12px + env(safe-area-inset-bottom));
  pointer-events: none;
}

.mobile-cta-wrap {
  display: flex;
  justify-content: center;
}

.mobile-cta-inner {
  width: min(100%, 520px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.9rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(220, 208, 242, 0.92);
  box-shadow: 0 20px 40px rgba(33, 22, 53, 0.16);
  pointer-events: auto;
}

.mobile-login-head {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  text-align: center;
}

.mobile-login-head h3,
.mobile-login-head p {
  margin: 0;
}

.mobile-login-head p {
  color: #6a5a84;
}

.mobile-login-brand {
  width: 44px;
  height: 44px;
}

.mobile-login-body {
  display: grid;
  gap: 1rem;
}

.mobile-login-divider {
  height: 1px;
  background: rgba(155, 107, 255, 0.18);
}

@media (min-width: 1011px) {
  .mobile-cta-bar {
    display: none;
  }
}
</style>
