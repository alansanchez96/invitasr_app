import { request } from '@/services/http'

export type CreditPurchasePlan = {
  id: number
  name: string
  price_usd: number
  billing_type: string
}

export type CreditPurchaseOffer = {
  key: 'credit_1' | 'credit_3' | 'credit_5' | 'upgrade_pro_x3' | 'upgrade_planner'
  title: string
  description: string
  badge: string
  credits: number
  discount_percent: number
  amount: number
  original_amount: number
  currency: string
  plan_id: number
  plan_name: string
  billing_type?: string
  purchase_kind: 'credit_pack' | 'plan_upgrade_credit_pack' | 'plan_upgrade_subscription'
  previous_plan_id?: number | null
  previous_plan_name?: string | null
  credit_policy?: 'preserve_existing' | 'expire_existing' | string
  active_invitations_policy?: 'preserve_existing' | string
}

export type CreditPurchaseOptions = {
  can_buy_credits: boolean
  available_credits: number
  current_plan: CreditPurchasePlan | null
  offers: Record<string, CreditPurchaseOffer>
  upgrade_offer: CreditPurchaseOffer | null
  upgrade_offers: Record<string, CreditPurchaseOffer>
}

export type CreditPurchaseCheckoutResult = {
  checkout_url: string | null
  payment_id: number | null
  offer: CreditPurchaseOffer | null
}

type ApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const ENDPOINT = '/tenant/credit-purchases'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizePlan = (value: unknown): CreditPurchasePlan | null => {
  const source = toRecord(value)
  if (!Object.keys(source).length) return null
  return {
    id: toNumber(source.id, 0),
    name: String(source.name ?? ''),
    price_usd: toNumber(source.price_usd, 0),
    billing_type: String(source.billing_type ?? ''),
  }
}

const normalizeOffer = (value: unknown): CreditPurchaseOffer => {
  const source = toRecord(value)
  return {
    key: String(source.key ?? 'credit_1') as CreditPurchaseOffer['key'],
    title: String(source.title ?? ''),
    description: String(source.description ?? ''),
    badge: String(source.badge ?? ''),
    credits: toNumber(source.credits, 0),
    discount_percent: toNumber(source.discount_percent, 0),
    amount: toNumber(source.amount, 0),
    original_amount: toNumber(source.original_amount, 0),
    currency: String(source.currency ?? 'usd'),
    plan_id: toNumber(source.plan_id, 0),
    plan_name: String(source.plan_name ?? ''),
    billing_type: String(source.billing_type ?? ''),
    purchase_kind: String(source.purchase_kind ?? 'credit_pack') as CreditPurchaseOffer['purchase_kind'],
    previous_plan_id: source.previous_plan_id === null || source.previous_plan_id === undefined
      ? null
      : toNumber(source.previous_plan_id, 0),
    previous_plan_name: source.previous_plan_name === null || source.previous_plan_name === undefined
      ? null
      : String(source.previous_plan_name),
    credit_policy: source.credit_policy ? String(source.credit_policy) : undefined,
    active_invitations_policy: source.active_invitations_policy ? String(source.active_invitations_policy) : undefined,
  }
}

export const getCreditPurchaseOptions = async (): Promise<CreditPurchaseOptions> => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${ENDPOINT}/options`)
  const data = toRecord(payload.data)
  const rawOffers = toRecord(data.offers)
  const offers = Object.fromEntries(
    Object.entries(rawOffers).map(([key, value]) => [key, normalizeOffer(value)]),
  )
  const rawUpgradeOffers = toRecord(data.upgrade_offers)
  const upgradeOffers = Object.fromEntries(
    Object.entries(rawUpgradeOffers).map(([key, value]) => [key, normalizeOffer(value)]),
  )

  return {
    can_buy_credits: Boolean(data.can_buy_credits),
    available_credits: toNumber(data.available_credits, 0),
    current_plan: normalizePlan(data.current_plan),
    offers,
    upgrade_offer: data.upgrade_offer ? normalizeOffer(data.upgrade_offer) : null,
    upgrade_offers: upgradeOffers,
  }
}

export const checkoutCreditPurchase = async (offer: CreditPurchaseOffer['key']) => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${ENDPOINT}/checkout`, {
    method: 'POST',
    body: { offer },
  })
  const data = toRecord(payload.data)

  return {
    checkout_url: data.checkout_url ? String(data.checkout_url) : null,
    payment_id: data.payment_id == null ? null : toNumber(data.payment_id, 0),
    offer: data.offer ? normalizeOffer(data.offer) : null,
  } satisfies CreditPurchaseCheckoutResult
}
