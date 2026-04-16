<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

type ReturnStatus = 'success' | 'cancel' | 'failure' | 'pending'

const SUCCESS_REDIRECT_SECONDS = 5

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const isLoading = ref(false)
const countdown = ref(SUCCESS_REDIRECT_SECONDS)
const dialogRef = ref<HTMLElement | null>(null)
const hasShownSuccessDialog = ref(false)

let countdownInterval: number | undefined
let redirectTimeout: number | undefined

const returnStatus = computed<ReturnStatus>(() => {
  const value = String(route.meta.paymentReturnStatus ?? 'pending').trim().toLowerCase()
  if (value === 'success' || value === 'cancel' || value === 'failure') {
    return value
  }
  return 'pending'
})

const successVisitKey = computed(() => {
  const paymentRef =
    String(route.query.session_id ?? route.query.payment_id ?? route.query.collection_id ?? route.query.preference_id ?? '')
      .trim() || route.fullPath
  return `payment-return-success:${paymentRef}`
})

const isSuccess = computed(() => returnStatus.value === 'success')

const content = computed(() => {
  if (isSuccess.value) {
    return {
      eyebrow: 'Pago aprobado',
      title: 'Tu pago fue aprobado',
      description: 'En unos segundos te llevaremos a tu panel para que empieces con tu invitacion.',
      primaryLabel: 'Ir ahora a mi panel',
      primaryTo: '/panel',
      secondaryLabel: 'Volver al inicio',
      secondaryTo: '/',
    }
  }

  if (returnStatus.value === 'cancel') {
    return {
      eyebrow: 'Pago cancelado',
      title: 'Tu pago no se completo',
      description: 'Puedes volver cuando quieras para terminar la compra y activar tu plan.',
      primaryLabel: 'Retomar pago',
      primaryTo: '/onboarding/public',
      secondaryLabel: 'Ver planes',
      secondaryTo: '/planes',
    }
  }

  if (returnStatus.value === 'failure') {
    return {
      eyebrow: 'Pago rechazado',
      title: 'No pudimos aprobar el cobro',
      description: 'Revisa tu medio de pago o intenta nuevamente para activar tu plan.',
      primaryLabel: 'Reintentar pago',
      primaryTo: '/onboarding/public',
      secondaryLabel: 'Volver al inicio',
      secondaryTo: '/',
    }
  }

  return {
    eyebrow: 'Pago en revision',
    title: 'Estamos revisando tu pago',
    description: 'Cuando el pago quede confirmado, tu cuenta se activara y podras continuar.',
    primaryLabel: 'Revisar estado',
    primaryTo: '/onboarding/public',
    secondaryLabel: 'Volver al inicio',
    secondaryTo: '/',
  }
})

const clearTimers = () => {
  if (countdownInterval) {
    window.clearInterval(countdownInterval)
    countdownInterval = undefined
  }

  if (redirectTimeout) {
    window.clearTimeout(redirectTimeout)
    redirectTimeout = undefined
  }
}

const redirectToPanel = () => {
  clearTimers()
  void router.replace('/panel')
}

const startSuccessRedirect = () => {
  clearTimers()
  countdown.value = SUCCESS_REDIRECT_SECONDS

  countdownInterval = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
    void session.refreshMe()
  }, 1000)

  redirectTimeout = window.setTimeout(() => {
    redirectToPanel()
  }, SUCCESS_REDIRECT_SECONDS * 1000)
}

const refreshSessionState = async () => {
  isLoading.value = true
  try {
    await session.refreshMe()
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!isSuccess.value) {
    return
  }

  if (typeof window !== 'undefined' && sessionStorage.getItem(successVisitKey.value) === '1') {
    void router.replace('/panel')
    return
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(successVisitKey.value, '1')
  }

  hasShownSuccessDialog.value = true
  await refreshSessionState()
  startSuccessRedirect()

  await nextTick()
  dialogRef.value?.focus()
})

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <section class="section payment-return">
    <div class="container payment-return__container">
      <article
        ref="dialogRef"
        class="payment-return__card"
        :class="{ 'payment-return__card--success': isSuccess }"
        :role="isSuccess ? 'alertdialog' : 'region'"
        :aria-modal="isSuccess ? 'true' : undefined"
        :aria-live="isSuccess ? 'assertive' : 'polite'"
        tabindex="-1">
        <span class="payment-return__eyebrow">{{ content.eyebrow }}</span>
        <h1>{{ content.title }}</h1>
        <p>{{ content.description }}</p>

        <div v-if="isSuccess && hasShownSuccessDialog" class="payment-return__success-box">
          <strong class="payment-return__success-title">
            Tu pago fue aprobado y seras redirigido a tu panel en {{ countdown }} segundos.
          </strong>
          <p class="payment-return__success-copy">
            Preparamos tu acceso para que empieces a crear tu invitacion apenas entres.
          </p>
        </div>

        <p v-if="isLoading" class="payment-return__hint">Actualizando el estado de tu cuenta...</p>

        <div class="payment-return__actions">
          <RouterLink class="btn btn-primary" :to="content.primaryTo">{{ content.primaryLabel }}</RouterLink>
          <RouterLink class="btn btn-ghost" :to="content.secondaryTo">{{ content.secondaryLabel }}</RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.payment-return {
  min-height: 70vh;
  padding: 7rem 0 5rem;
  background:
    radial-gradient(circle at top, rgba(213, 231, 255, 0.72), transparent 42%),
    linear-gradient(180deg, #f7fbff 0%, #ffffff 48%, #f8f5ff 100%);
}

.payment-return__container {
  display: flex;
  justify-content: center;
}

.payment-return__card {
  width: min(100%, 700px);
  padding: clamp(1.75rem, 4vw, 3rem);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(184, 199, 255, 0.5);
  box-shadow: 0 28px 80px rgba(40, 58, 92, 0.12);
  display: grid;
  gap: 1rem;
  outline: none;
}

.payment-return__card--success {
  border-color: rgba(58, 160, 103, 0.34);
  box-shadow: 0 30px 90px rgba(33, 92, 61, 0.16);
}

.payment-return__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #3f6fd8;
}

.payment-return__card h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.1rem);
  line-height: 1.05;
  color: #18233a;
}

.payment-return__card p {
  margin: 0;
  color: #4f5d78;
  font-size: 1rem;
  line-height: 1.65;
}

.payment-return__success-box {
  padding: 1.15rem 1.2rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(230, 249, 238, 0.95), rgba(241, 250, 246, 0.95));
  border: 1px solid rgba(93, 178, 128, 0.25);
  display: grid;
  gap: 0.45rem;
}

.payment-return__success-title {
  color: #1d6b47;
  font-size: 1rem;
}

.payment-return__success-copy {
  color: #2d5d47;
}

.payment-return__hint {
  color: #3f6fd8;
  font-weight: 600;
}

.payment-return__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

@media (max-width: 720px) {
  .payment-return {
    padding-top: 6rem;
  }

  .payment-return__actions {
    flex-direction: column;
  }
}
</style>
