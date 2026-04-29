import { request } from '@/services/http'

export type TenantPaymentItem = {
  id: number
  plan_id: number | null
  plan_name: string | null
  plan_billing_type: string | null
  amount: string | null
  currency: string | null
  status: string | null
  type: string | null
  provider: string | null
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type TenantPaymentListParams = {
  page?: number
  perPage?: number
  search?: string
  status?: string
  sortBy?: 'id' | 'plan_name' | 'status' | 'amount' | 'currency' | 'paid_at' | 'created_at' | 'updated_at' | string
  sortDir?: 'asc' | 'desc' | string
}

export type TenantPaymentListDetail = {
  sort: {
    by: string
    dir: string
  }
  items: TenantPaymentItem[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

type TenantApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const TENANT_PAYMENTS_ENDPOINT = '/tenant/payments'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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

const normalizeItem = (value: unknown): TenantPaymentItem => {
  const source = toRecord(value)
  return {
    id: toNumber(source.id, 0),
    plan_id: source.plan_id == null ? null : toNumber(source.plan_id, 0),
    plan_name: source.plan_name ? String(source.plan_name) : null,
    plan_billing_type: source.plan_billing_type ? String(source.plan_billing_type) : null,
    amount: source.amount == null ? null : String(source.amount),
    currency: source.currency ? String(source.currency) : null,
    status: source.status ? String(source.status) : null,
    type: source.type ? String(source.type) : null,
    provider: source.provider ? String(source.provider) : null,
    paid_at: source.paid_at ? String(source.paid_at) : null,
    created_at: source.created_at ? String(source.created_at) : null,
    updated_at: source.updated_at ? String(source.updated_at) : null,
  }
}

export const listTenantPayments = async (
  params: TenantPaymentListParams = {},
): Promise<TenantPaymentListDetail> => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.search && params.search.trim()) search.set('search', params.search.trim())
  if (params.status && params.status.trim()) search.set('status', params.status.trim())
  if (params.sortBy && String(params.sortBy).trim()) search.set('sortBy', String(params.sortBy).trim())
  if (params.sortDir && String(params.sortDir).trim()) search.set('sortDir', String(params.sortDir).trim())

  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_PAYMENTS_ENDPOINT}?${search.toString()}`,
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

