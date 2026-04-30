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
const isCheckingOut = ref<string | null>(null)
const loadError = ref<string | null>(null)

const creditOffers = computed(() => Object.values(options.value?.offers ?? {}))
const plannerUpgradeOffer = computed(() =>
  Object.values(options.value?.upgrade_offers ?? {}).find((offer) => String(offer.plan_name).toLowerCase() === 'planner') ?? null,
)

const currentPlanName = computed(() => {
  const name = options.value?.current_plan?.name
  return name ? formatPlanName(name) : 'tu plan'
})

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

const loadOptions = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    options.value = await getCreditPurchaseOptions()
  } catch (error) {
    const payload = error as { message?: string }
    loadError.value = payload?.message ?? 'No pudimos cargar las opciones para comprar créditos.'
  } finally {
    isLoading.value = false
  }
}

const startCheckout = async (offer: CreditPurchaseOffer) => {
  if (isCheckingOut.value) return
  isCheckingOut.value = offer.key

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
    isCheckingOut.value = null
  }
}

onMounted(() => {
  void loadOptions()
})
</script>

<template>
  <section class="client-page container" aria-labelledby="buy-credits-title">
    <header class="hero-card bo-card">
      <div class="hero-copy">
        <p class="client-kicker">Comprar créditos</p>
        <h1 id="buy-credits-title">Crea más invitaciones cuando lo necesites</h1>
        <p>
          Suma créditos extra a {{ currentPlanName }} sin cambiar tu forma de trabajar. Elige una opción, completa el
          pago y tus créditos se agregan al aprobarse la compra.
        </p>
      </div>

      <aside class="balance-card" aria-label="Créditos disponibles">
        <span>Créditos disponibles</span>
        <strong>{{ options?.available_credits ?? 0 }}</strong>
        <small>Listos para publicar nuevas invitaciones.</small>
      </aside>
    </header>

    <p v-if="loadError" class="client-inline-note">{{ loadError }}</p>
    <p v-else-if="isLoading" class="client-inline-note">Cargando opciones...</p>

    <section v-else-if="options?.can_buy_credits" class="purchase-layout">
      <article v-if="plannerUpgradeOffer" class="planner-banner bo-card">
        <div>
          <p class="client-kicker">También puedes pasar a Planner</p>
          <h2>Invitaciones ilimitadas con {{ plannerUpgradeOffer.discount_percent }}% de descuento permanente</h2>
          <p>
            Conservas tus invitaciones activas y dejas de depender de créditos. Tus créditos actuales se dan de baja
            porque Planner ya incluye libertad total para publicar.
          </p>
        </div>

        <div class="planner-price">
          <span>{{ formatMoney(plannerUpgradeOffer.original_amount, plannerUpgradeOffer.currency) }}</span>
          <strong>{{ formatMoney(plannerUpgradeOffer.amount, plannerUpgradeOffer.currency) }}</strong>
          <small>{{ savingsLabel(plannerUpgradeOffer) }}</small>
        </div>

        <BaseButton
          type="button"
          variant="primary"
          class="dashboard-action-btn planner-btn"
          :disabled="Boolean(isCheckingOut)"
          @click="startCheckout(plannerUpgradeOffer)">
          {{ isCheckingOut === plannerUpgradeOffer.key ? 'Preparando pago...' : 'Suscribirme a Planner' }}
        </BaseButton>
      </article>

      <div class="offers-grid" aria-label="Opciones para comprar créditos">
        <article v-for="offer in creditOffers" :key="offer.key" class="offer-card bo-card">
          <div class="offer-badge">{{ offer.badge }}</div>
          <h2>{{ offer.title }}</h2>
          <p>{{ offer.description }}</p>

          <div class="price-row">
            <span>{{ formatMoney(offer.original_amount, offer.currency) }}</span>
            <strong>{{ formatMoney(offer.amount, offer.currency) }}</strong>
          </div>

          <ul class="offer-points">
            <li>{{ offer.credits }} {{ offer.credits === 1 ? 'crédito' : 'créditos' }} para publicar</li>
            <li>{{ offer.discount_percent }}% de descuento aplicado</li>
            <li>{{ savingsLabel(offer) }}</li>
          </ul>

          <BaseButton
            type="button"
            variant="primary"
            class="dashboard-action-btn"
            :disabled="Boolean(isCheckingOut)"
            @click="startCheckout(offer)">
            {{ isCheckingOut === offer.key ? 'Preparando pago...' : 'Comprar ahora' }}
          </BaseButton>
        </article>
      </div>

      <article v-if="options.upgrade_offer" class="upgrade-card bo-card">
        <div>
          <p class="client-kicker">Oferta recomendada</p>
          <h2>{{ options.upgrade_offer.title }}</h2>
          <p>
            Mejora tu plan, suma 3 créditos y accede a más recursos para que tus invitaciones se vean y se gestionen
            mejor.
          </p>
        </div>

        <div class="upgrade-price">
          <span>{{ formatMoney(options.upgrade_offer.original_amount, options.upgrade_offer.currency) }}</span>
          <strong>{{ formatMoney(options.upgrade_offer.amount, options.upgrade_offer.currency) }}</strong>
          <small>25% de descuento incluido</small>
        </div>

        <BaseButton
          type="button"
          variant="primary"
          class="dashboard-action-btn upgrade-btn"
          :disabled="Boolean(isCheckingOut)"
          @click="startCheckout(options.upgrade_offer)">
          {{ isCheckingOut === options.upgrade_offer.key ? 'Preparando pago...' : 'Mejorar a Pro' }}
        </BaseButton>
      </article>
    </section>

    <article v-else-if="options" class="bo-card unavailable-card">
      <p class="client-kicker">No disponible para tu plan actual</p>
      <h2>Esta compra está pensada para planes Basic y Pro</h2>
      <p>
        Si necesitas más capacidad o una operación más completa, puedes revisar las opciones de mejora disponibles para
        tu cuenta.
      </p>
      <BaseButton as="RouterLink" to="/panel/mejorar-plan" variant="primary" class="dashboard-action-btn">
        Ver opciones de plan
      </BaseButton>
    </article>
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
.offer-card,
.planner-banner,
.upgrade-card,
.unavailable-card {
  min-width: 0;
  padding: 22px;
}

.hero-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 255, 255, 0.98), transparent 30%),
    linear-gradient(135deg, rgba(248, 243, 255, 0.98), rgba(238, 246, 255, 0.92));
  border: 1px solid rgba(128, 80, 210, 0.18);
}

.hero-card::after {
  content: '';
  position: absolute;
  right: -70px;
  bottom: -95px;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(126, 79, 224, 0.22), rgba(229, 74, 178, 0.22));
  filter: blur(4px);
}

.hero-copy,
.balance-card {
  position: relative;
  z-index: 1;
}

.client-kicker {
  margin: 0 0 0.45rem;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(90, 48, 140, 0.68);
  font-weight: 800;
}

.hero-copy h1,
.offer-card h2,
.upgrade-card h2,
.unavailable-card h2 {
  margin: 0;
  color: #211239;
}

.hero-copy p,
.offer-card p,
.upgrade-card p,
.unavailable-card p,
.client-inline-note {
  margin: 0;
  color: #6a5a84;
  line-height: 1.55;
}

.balance-card {
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

.balance-card span,
.balance-card small {
  color: #74628c;
  font-weight: 700;
}

.balance-card strong {
  font-size: clamp(42px, 8vw, 68px);
  line-height: 0.95;
  color: #7b4ee0;
}

.purchase-layout {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.offers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}

.offer-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 14px;
  border: 1px solid rgba(126, 79, 224, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(251, 248, 255, 0.9)),
    radial-gradient(circle at 20% 0%, rgba(126, 79, 224, 0.18), transparent 30%);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.offer-card:hover {
  transform: translateY(-3px);
  border-color: rgba(126, 79, 224, 0.34);
  box-shadow: 0 24px 60px rgba(54, 31, 86, 0.12);
}

.offer-badge {
  width: fit-content;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(126, 79, 224, 0.12);
  color: #5a318c;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.price-row {
  display: grid;
  gap: 2px;
}

.price-row span,
.planner-price span,
.upgrade-price span {
  color: #8a7a9c;
  font-weight: 800;
  text-decoration: line-through;
}

.price-row strong,
.planner-price strong,
.upgrade-price strong {
  color: #211239;
  font-size: clamp(28px, 5vw, 40px);
  line-height: 1;
}

.offer-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.offer-points li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #503f68;
  font-weight: 750;
}

.offer-points li::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7b4ee0, #e54ab2);
  box-shadow: 0 0 0 4px rgba(126, 79, 224, 0.1);
}

.dashboard-action-btn {
  justify-self: start;
  min-height: 42px;
  border-radius: 14px;
  white-space: nowrap;
}

.upgrade-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  background:
    linear-gradient(135deg, rgba(33, 18, 57, 0.96), rgba(88, 48, 140, 0.94)),
    radial-gradient(circle at 90% 20%, rgba(229, 74, 178, 0.34), transparent 35%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 70px rgba(33, 18, 57, 0.22);
}

.planner-banner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(45, 212, 191, 0.22), transparent 34%),
    linear-gradient(135deg, #102a43, #211239);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 24px 70px rgba(16, 42, 67, 0.2);
}

.planner-banner .client-kicker,
.planner-banner h2,
.planner-banner p {
  color: #fff;
}

.planner-price {
  display: grid;
  justify-items: end;
  gap: 4px;
  color: #fff;
}

.planner-price strong,
.planner-price small {
  color: #fff;
}

.planner-price span {
  color: rgba(255, 255, 255, 0.62);
}

.planner-btn {
  background: linear-gradient(135deg, #ffffff, #dffcf7) !important;
  color: #102a43 !important;
}

.upgrade-card .client-kicker,
.upgrade-card h2,
.upgrade-card p {
  color: white;
}

.upgrade-price {
  display: grid;
  justify-items: end;
  gap: 4px;
  color: white;
}

.upgrade-price strong,
.upgrade-price small {
  color: white;
}

.upgrade-price span {
  color: rgba(255, 255, 255, 0.62);
}

.upgrade-btn {
  background: linear-gradient(135deg, #ffffff, #f2e9ff) !important;
  color: #3a1d63 !important;
}

.unavailable-card {
  display: grid;
  gap: 12px;
}

@media (max-width: 980px) {
  .hero-card,
  .offers-grid,
  .planner-banner,
  .upgrade-card {
    grid-template-columns: 1fr;
  }

  .upgrade-price {
    justify-items: start;
  }
}

@media (max-width: 720px) {
  .client-page {
    max-width: none;
    width: 100%;
    padding-inline: 0;
  }

  .hero-card,
  .offer-card,
  .planner-banner,
  .upgrade-card,
  .unavailable-card {
    width: 100%;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    padding: 20px 28px;
  }

  .dashboard-action-btn {
    width: 100%;
    justify-self: stretch;
  }
}
</style>
