<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { renewTenantSubscription } from '@/services/tenantSubscriptions'
import { useSessionStore } from '@/stores/session'
import { notifyError } from '@/utils/toast'

const session = useSessionStore()
const isRenewing = ref(false)

const planName = computed(() => {
  const name = String(session.user?.client_plan?.plan?.name ?? '').trim().toLowerCase()
  if (name === 'planner') return 'Planner'
  if (name === 'pro') return 'Pro'
  if (name === 'basic') return 'Basic'
  return 'tu plan'
})

const renewalDate = computed(() => {
  const value = session.user?.client_plan?.current_period_end
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
})

const isExpired = computed(() => Boolean(session.user?.client_plan?.renewal_required))

const startRenewal = async () => {
  if (isRenewing.value) return

  isRenewing.value = true
  try {
    const result = await renewTenantSubscription()
    if (!result.url) {
      notifyError('No pudimos abrir la renovación. Intenta nuevamente en unos segundos.')
      return
    }
    window.location.href = result.url
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos abrir la renovación.')
  } finally {
    isRenewing.value = false
  }
}
</script>

<template>
  <section class="renew-page" aria-labelledby="renew-subscription-title">
    <article class="renew-card">
      <div class="renew-orb" aria-hidden="true"></div>

      <p class="renew-kicker">Renovar suscripción</p>
      <h1 id="renew-subscription-title">
        {{ isExpired ? 'Reactiva tu acceso a InvitaSR' : 'Mantén activo tu plan' }}
      </h1>

      <p class="renew-lead">
        Tu plan {{ planName }} es mensual. Para continuar usando tus herramientas, renueva la suscripción desde un pago seguro.
      </p>

      <div class="renew-summary">
        <div>
          <span>Plan</span>
          <strong>{{ planName }}</strong>
        </div>
        <div>
          <span>{{ isExpired ? 'Acceso vencido' : 'Disponible hasta' }}</span>
          <strong>{{ renewalDate ?? 'Fecha no disponible' }}</strong>
        </div>
      </div>

      <p class="renew-note">
        Solo verás la renovación del plan mensual. Los planes de pago único no aparecen en esta pantalla.
      </p>

      <BaseButton
        type="button"
        class="renew-action"
        :loading="isRenewing"
        :disabled="isRenewing"
        @click="startRenewal">
        {{ isRenewing ? 'Abriendo pago...' : 'Renovar suscripción' }}
      </BaseButton>
    </article>
  </section>
</template>

<style scoped>
.renew-page {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  padding: clamp(22px, 5vw, 64px);
}

.renew-card {
  position: relative;
  overflow: hidden;
  width: min(100%, 760px);
  display: grid;
  gap: 18px;
  padding: clamp(26px, 5vw, 48px);
  border-radius: 32px;
  border: 1px solid rgba(122, 79, 217, 0.18);
  background:
    radial-gradient(circle at 18% 12%, rgba(229, 74, 178, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 243, 255, 0.94));
  box-shadow: 0 24px 70px rgba(51, 32, 90, 0.16);
}

.renew-orb {
  position: absolute;
  right: -70px;
  top: -70px;
  width: 190px;
  height: 190px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(111, 57, 187, 0.22), rgba(229, 74, 178, 0.18));
  filter: blur(1px);
}

.renew-kicker {
  margin: 0;
  color: #7a55ad;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.renew-card h1 {
  position: relative;
  margin: 0;
  max-width: 620px;
  color: #1f1442;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 0.96;
}

.renew-lead,
.renew-note {
  position: relative;
  margin: 0;
  color: #66547f;
  font-size: 1.02rem;
  line-height: 1.65;
}

.renew-summary {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.renew-summary div {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(122, 79, 217, 0.16);
  background: rgba(255, 255, 255, 0.76);
}

.renew-summary span {
  color: #836aa9;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.renew-summary strong {
  color: #271847;
  font-size: 1.08rem;
}

.renew-action {
  position: relative;
  width: fit-content;
  min-width: 220px;
  justify-self: start;
}

@media (max-width: 640px) {
  .renew-page {
    place-items: start stretch;
    padding: 18px;
  }

  .renew-card {
    border-radius: 24px;
  }

  .renew-summary {
    grid-template-columns: 1fr;
  }

  .renew-action {
    width: 100%;
  }
}
</style>
