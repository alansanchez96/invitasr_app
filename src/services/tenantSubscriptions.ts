import { request } from '@/services/http'

export type TenantSubscriptionItem = {
  id: number
  plan_id: number | null
  plan_name: string | null
  plan_billing_type: string | null
  status: string | null
  provider: string | null
  provider_subscription_id: string | null
  provider_customer_id: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
}

export type TenantSubscriptionListParams = {
  page?: number
  perPage?: number
  search?: string
  status?: string
  sortBy?:
    | 'id'
    | 'current_period_start'
    | 'current_period_end'
    | 'status'
    | 'cancel_at_period_end'
    | 'canceled_at'
    | 'created_at'
    | 'updated_at'
    | string
  sortDir?: 'asc' | 'desc' | string
}

export type TenantSubscriptionListDetail = {
  sort: {
    by: string
    dir: string
  }
  items: TenantSubscriptionItem[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export type TenantSubscriptionCancelResult = {
  id: number
  status: string
  cancel_at_period_end: boolean
  canceled_at: string | null
}

export type TenantSubscriptionRenewResult = {
  url: string | null
  payment_id: number | null
  plan: {
    id: number
    name: string
    billing_type: string
  } | null
}

type TenantApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const TENANT_SUBSCRIPTIONS_ENDPOINT = '/tenant/subscriptions'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 'sí'
  }
  return false
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  const source = toRecord(value)
  for (const key of ['items', 'data', 'rows', 'list']) {
    if (Array.isArray(source[key])) {
      return source[key] as unknown[]
    }
  }
  return []
}

const normalizeItem = (value: unknown): TenantSubscriptionItem => {
  const source = toRecord(value)
  return {
    id: toNumber(source.id, 0),
    plan_id: source.plan_id == null ? null : toNumber(source.plan_id, 0),
    plan_name: source.plan_name ? String(source.plan_name) : null,
    plan_billing_type: source.plan_billing_type ? String(source.plan_billing_type) : null,
    status: source.status ? String(source.status) : null,
    provider: source.provider ? String(source.provider) : null,
    provider_subscription_id: source.provider_subscription_id
      ? String(source.provider_subscription_id)
      : null,
    provider_customer_id: source.provider_customer_id ? String(source.provider_customer_id) : null,
    cancel_at_period_end: toBoolean(source.cancel_at_period_end),
    canceled_at: source.canceled_at ? String(source.canceled_at) : null,
    current_period_start: source.current_period_start ? String(source.current_period_start) : null,
    current_period_end: source.current_period_end ? String(source.current_period_end) : null,
    created_at: source.created_at ? String(source.created_at) : null,
    updated_at: source.updated_at ? String(source.updated_at) : null,
  }
}

export const listTenantSubscriptions = async (
  params: TenantSubscriptionListParams = {},
): Promise<TenantSubscriptionListDetail> => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.search && params.search.trim()) search.set('search', params.search.trim())
  if (params.status && params.status.trim()) search.set('status', params.status.trim())
  if (params.sortBy && String(params.sortBy).trim()) search.set('sortBy', String(params.sortBy).trim())
  if (params.sortDir && String(params.sortDir).trim()) search.set('sortDir', String(params.sortDir).trim())

  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_SUBSCRIPTIONS_ENDPOINT}?${search.toString()}`,
  )
  const data = toRecord(payload.data)
  const pagination = toRecord(data.pagination)
  const sort = toRecord(data.sort)

  return {
    sort: {
      by: String(sort.by ?? 'id'),
      dir: String(sort.dir ?? 'desc'),
    },
    items: extractList(data.items).map(normalizeItem),
    pagination: {
      current_page: toNumber(pagination.current_page, 1),
      last_page: toNumber(pagination.last_page, 1),
      per_page: toNumber(pagination.per_page, 10),
      total: toNumber(pagination.total, 0),
    },
  }
}

export const cancelTenantSubscription = async (subscriptionId: string | number) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_SUBSCRIPTIONS_ENDPOINT}/${subscriptionId}/cancel`,
    { method: 'POST' },
  )
  const data = toRecord(payload.data)

  return {
    id: toNumber(data.id, Number(subscriptionId)),
    status: data.status ? String(data.status) : 'canceled',
    cancel_at_period_end: toBoolean(data.cancel_at_period_end),
    canceled_at: data.canceled_at ? String(data.canceled_at) : null,
  } satisfies TenantSubscriptionCancelResult
}

export const renewTenantSubscription = async (): Promise<TenantSubscriptionRenewResult> => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_SUBSCRIPTIONS_ENDPOINT}/renew`,
    { method: 'POST' },
  )
  const data = toRecord(payload.data)
  const plan = toRecord(data.plan)

  return {
    url: data.url ? String(data.url) : null,
    payment_id: data.payment_id == null ? null : toNumber(data.payment_id, 0),
    plan: plan.id
      ? {
          id: toNumber(plan.id, 0),
          name: String(plan.name ?? ''),
          billing_type: String(plan.billing_type ?? ''),
        }
      : null,
  }
}
