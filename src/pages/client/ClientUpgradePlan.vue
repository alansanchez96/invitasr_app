<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  checkoutCreditPurchase,
  getCreditPurchaseOptions,
  type CreditPurchaseOffer,
  type CreditPurchaseOptions,
} from '@/services/tenantCreditPurchases'
import { notifyError } from '@/utils/toast'
import { formatPlanName } from '@/utils/publicPlanMarketing'

const options = ref<CreditPurchaseOptions | null>(null)
const isLoading = ref(false)
const isCheckingOut = ref(false)
const loadError = ref<string | null>(null)
const selectedOffer = ref<CreditPurchaseOffer | null>(null)

const upgradeOffers = computed(() => Object.values(options.value?.upgrade_offers ?? {}))

const currentPlanName = computed(() => {
  const name = options.value?.current_plan?.name
  return name ? formatPlanName(name) : 'tu plan actual'
})

const hasUpgradeOffers = computed(() => upgradeOffers.value.length > 0)

const formatMoney = (amount: number, currency = 'usd') => {
  const code = String(currency || 'usd').toUpperCase()
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))
}

const savingsLabel = (offer: CreditPurchaseOffer) => {
  const saved = Math.max(0, Number(offer.original_amount) - Number(offer.amount))
  return `Ahorras ${formatMoney(saved, offer.currency)}`
}

const isPlannerOffer = (offer?: CreditPurchaseOffer | null) =>
  String(offer?.plan_name ?? '').trim().toLowerCase() === 'planner'

const getOfferPoints = (offer: CreditPurchaseOffer) => {
  if (isPlannerOffer(offer)) {
    return [
      'Invitaciones ilimitadas para operar con más libertad.',
      'Conservas tus invitaciones activas.',
      'Tus créditos actuales se reemplazan porque ya no los necesitarás.',
    ]
  }

  return [
    'Conservas tus créditos acumulados.',
    'Mantienes tus invitaciones activas.',
    'Recibes 3 créditos nuevos para publicar más invitaciones.',
  ]
}

const modalCopy = computed(() => {
  const offer = selectedOffer.value
  if (!offer) return ''

  if (isPlannerOffer(offer)) {
    return 'Al suscribirte a Planner mantendrás tus invitaciones activas. Tus créditos actuales se darán de baja porque pasarás a invitaciones ilimitadas.'
  }

  return 'Al mejorar a Pro no perderás tus créditos acumulados ni tus invitaciones activas. Además recibirás 3 créditos nuevos incluidos en esta mejora.'
})

const loadOptions = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    options.value = await getCreditPurchaseOptions()
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar tus opciones de mejora.'
  } finally {
    isLoading.value = false
  }
}

const openConfirmModal = (offer: CreditPurchaseOffer) => {
  selectedOffer.value = offer
}

const closeConfirmModal = () => {
  if (isCheckingOut.value) return
  selectedOffer.value = null
}

const startCheckout = async () => {
  const offer = selectedOffer.value
  if (!offer || isCheckingOut.value) return

  isCheckingOut.value = true
  try {
    const result = await checkoutCreditPurchase(offer.key)
    if (!result.checkout_url) {
      throw new Error('No recibimos el enlace de pago.')
    }
    window.location.assign(result.checkout_url)
  } catch (error) {
    const payload = error as { message?: string }
    notifyError(payload?.message ?? 'No pudimos iniciar el pago.')
  } finally {
    isCheckingOut.value = false
  }
}

onMounted(() => {
  void loadOptions()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="client-upgrade-title">
    <header class="hero-card bo-card">
      <div>
        <p class="client-kicker">Mejorar plan</p>
        <h1 id="client-upgrade-title">Más capacidad para crear experiencias memorables</h1>
        <p>
          Hoy tienes {{ currentPlanName }}. Estas mejoras son exclusivas para clientes y ya incluyen descuentos
          permanentes dentro de InvitaSR.
        </p>
      </div>

      <aside class="current-card" aria-label="Plan actual">
        <span>Plan actual</span>
        <strong>{{ currentPlanName }}</strong>
        <small>Créditos disponibles: {{ options?.available_credits ?? 0 }}</small>
      </aside>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando opciones...</p>

    <section v-else-if="hasUpgradeOffers" class="upgrade-grid" aria-label="Opciones de mejora">
      <article
        v-for="offer in upgradeOffers"
        :key="offer.key"
        class="upgrade-card bo-card"
        :class="{ 'upgrade-card--planner': isPlannerOffer(offer) }">
        <div class="offer-badge">{{ offer.badge }}</div>
        <h2>{{ formatPlanName(offer.plan_name) }}</h2>
        <p class="offer-copy">{{ offer.description }}</p>

        <div class="price-box">
          <span>{{ formatMoney(offer.original_amount, offer.currency) }}</span>
          <strong>{{ formatMoney(offer.amount, offer.currency) }}</strong>
          <small>{{ offer.discount_percent }}% de descuento permanente · {{ savingsLabel(offer) }}</small>
        </div>

        <ul class="feature-list">
          <li v-for="point in getOfferPoints(offer)" :key="point">{{ point }}</li>
        </ul>

        <BaseButton
          type="button"
          variant="primary"
          class="dashboard-action-btn"
          :disabled="isCheckingOut"
          @click="openConfirmModal(offer)">
          Mejorar a {{ formatPlanName(offer.plan_name) }}
        </BaseButton>
      </article>
    </section>

    <article v-else-if="options" class="bo-card empty-card">
      <p class="client-kicker">Sin mejoras disponibles</p>
      <h2>Tu plan actual ya está en el nivel más alto disponible</h2>
      <p>Si necesitas una configuración especial, puedes contactarnos para evaluar una opción a medida.</p>
    </article>

    <Transition name="modal-fade">
      <div
        v-if="selectedOffer"
        class="upgrade-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeConfirmModal">
        <article class="upgrade-modal bo-card">
          <button
            type="button"
            class="modal-close"
            aria-label="Cerrar"
            :disabled="isCheckingOut"
            @click="closeConfirmModal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <p class="client-kicker">Confirmar mejora</p>
          <h2>Mejorar a {{ formatPlanName(selectedOffer.plan_name) }}</h2>
          <p>{{ modalCopy }}</p>

          <div class="modal-price">
            <span>{{ formatMoney(selectedOffer.original_amount, selectedOffer.currency) }}</span>
            <strong>{{ formatMoney(selectedOffer.amount, selectedOffer.currency) }}</strong>
            <small>{{ selectedOffer.discount_percent }}% de descuento aplicado.</small>
          </div>

          <div class="modal-actions">
            <BaseButton type="button" variant="ghost" :disabled="isCheckingOut" @click="closeConfirmModal">
              Cancelar
            </BaseButton>
            <BaseButton type="button" variant="primary" :disabled="isCheckingOut" @click="startCheckout">
              {{ isCheckingOut ? 'Preparando pago...' : 'Continuar al pago' }}
            </BaseButton>
          </div>
        </article>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.client-page {
  display: grid;
  gap: 18px;
  width: 100%;
  max-width: 1320px;
  min-width: 0;
  margin: 0 auto;
  overflow-x: hidden;
}

.hero-card,
.upgrade-card,
.empty-card {
  padding: 22px;
}

.hero-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 10%, rgba(255, 255, 255, 0.95), transparent 32%),
    linear-gradient(135deg, rgba(248, 243, 255, 0.98), rgba(238, 246, 255, 0.92));
  border: 1px solid rgba(128, 80, 210, 0.18);
}

.hero-card h1,
.upgrade-card h2,
.empty-card h2,
.upgrade-modal h2 {
  margin: 0;
  color: #211239;
}

.hero-card p,
.offer-copy,
.empty-card p,
.upgrade-modal p,
.client-inline-note {
  margin: 0;
  color: #6a5a84;
  line-height: 1.55;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.68);
  font-weight: 800;
}

.current-card {
  display: grid;
  align-content: center;
  gap: 6px;
  min-height: 150px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(135, 93, 216, 0.2);
  box-shadow: 0 18px 45px rgba(73, 49, 112, 0.12);
}

.current-card span,
.current-card small {
  color: #74628c;
  font-weight: 700;
}

.current-card strong {
  color: #211239;
  font-size: clamp(1.4rem, 4vw, 2.2rem);
}

.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.upgrade-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 14px;
  overflow: hidden;
  border: 1px solid rgba(123, 78, 224, 0.22);
  background:
    radial-gradient(circle at top right, rgba(184, 141, 255, 0.2), transparent 45%),
    linear-gradient(180deg, #ffffff 0%, #f8f2ff 100%);
}

.upgrade-card--planner {
  border-color: rgba(20, 184, 166, 0.24);
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.2), transparent 45%),
    linear-gradient(180deg, #ffffff 0%, #effdf9 100%);
}

.offer-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: #211239;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
}

.price-box,
.modal-price {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 111, 214, 0.2);
}

.price-box span,
.modal-price span {
  width: fit-content;
  color: #8a7ca4;
  text-decoration: line-through;
  font-weight: 700;
}

.price-box strong,
.modal-price strong {
  color: #211239;
  font-size: clamp(1.35rem, 4vw, 2rem);
}

.price-box small,
.modal-price small {
  color: #5b3d84;
  font-weight: 800;
}

.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 9px;
}

.feature-list li {
  position: relative;
  padding-left: 1.45rem;
  color: #4b3b64;
  font-weight: 650;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
}

.dashboard-action-btn {
  justify-self: start;
  min-height: 42px;
  border-radius: 12px;
  font-weight: 800;
}

.upgrade-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 160;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(7px);
}

.upgrade-modal {
  position: relative;
  width: min(560px, 100%);
  display: grid;
  gap: 14px;
  padding: 24px;
  border: 1px solid rgba(155, 107, 255, 0.28);
  background:
    radial-gradient(circle at 0% 0%, rgba(237, 233, 254, 0.9), transparent 40%),
    linear-gradient(180deg, #fff, #fbf7ff);
  box-shadow: 0 28px 70px rgba(18, 14, 38, 0.34);
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #211239;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .dashboard-action-btn,
  .modal-actions,
  .modal-actions :deep(.btn) {
    width: 100%;
  }

  .modal-actions {
    display: grid;
  }
}
</style>
