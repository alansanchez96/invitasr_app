import { request } from '@/services/http'

export type TenantPaymentItem = {
  id: number
  plan_id: number | null
  plan_name: string | null
  plan_billing_type: string | null
  amount: string | null
  original_amount: string | null
  currency: string | null
  status: string | null
  type: string | null
  purchase_kind: string | null
  purchase_category: 'plan_purchase' | 'credit_purchase' | 'plan_upgrade' | string | null
  purchase_label: string | null
  purchase_description: string | null
  credit_quantity: number | null
  discount_percent: number | null
  from_plan_name: string | null
  to_plan_name: string | null
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
  sortBy?: 'id' | 'plan_name' | 'status' | 'amount' | 'currency' | 'purchase_kind' | 'paid_at' | 'created_at' | 'updated_at' | string
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

export type TenantPaymentHistoryItem = {
  id: string
  source: 'payment' | 'credit_movement' | string
  source_id: number
  occurred_at: string | null
  category: 'payment' | 'plan' | 'credit' | string
  movement_type: string | null
  label: string | null
  description: string | null
  status: string | null
  amount: string | null
  currency: string | null
  provider: string | null
  plan_id: number | null
  plan_name: string | null
  credit_delta: number | null
  reference_label: string | null
}

export type TenantPaymentHistoryParams = {
  page?: number
  perPage?: number
  search?: string
  category?: 'all' | 'payment' | 'plan' | 'credit' | string
  sortDir?: 'asc' | 'desc' | string
}

export type TenantPaymentHistoryDetail = {
  sort: {
    by: string
    dir: string
  }
  filters: {
    category: string
    search: string
  }
  items: TenantPaymentHistoryItem[]
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
    original_amount: source.original_amount == null ? null : String(source.original_amount),
    currency: source.currency ? String(source.currency) : null,
    status: source.status ? String(source.status) : null,
    type: source.type ? String(source.type) : null,
    purchase_kind: source.purchase_kind ? String(source.purchase_kind) : null,
    purchase_category: source.purchase_category ? String(source.purchase_category) : null,
    purchase_label: source.purchase_label ? String(source.purchase_label) : null,
    purchase_description: source.purchase_description ? String(source.purchase_description) : null,
    credit_quantity: source.credit_quantity == null ? null : toNumber(source.credit_quantity, 0),
    discount_percent: source.discount_percent == null ? null : toNumber(source.discount_percent, 0),
    from_plan_name: source.from_plan_name ? String(source.from_plan_name) : null,
    to_plan_name: source.to_plan_name ? String(source.to_plan_name) : null,
    provider: source.provider ? String(source.provider) : null,
    paid_at: source.paid_at ? String(source.paid_at) : null,
    created_at: source.created_at ? String(source.created_at) : null,
    updated_at: source.updated_at ? String(source.updated_at) : null,
  }
}

const normalizeHistoryItem = (value: unknown): TenantPaymentHistoryItem => {
  const source = toRecord(value)
  return {
    id: source.id ? String(source.id) : '',
    source: source.source ? String(source.source) : '',
    source_id: toNumber(source.source_id, 0),
    occurred_at: source.occurred_at ? String(source.occurred_at) : null,
    category: source.category ? String(source.category) : '',
    movement_type: source.movement_type ? String(source.movement_type) : null,
    label: source.label ? String(source.label) : null,
    description: source.description ? String(source.description) : null,
    status: source.status ? String(source.status) : null,
    amount: source.amount == null ? null : String(source.amount),
    currency: source.currency ? String(source.currency) : null,
    provider: source.provider ? String(source.provider) : null,
    plan_id: source.plan_id == null ? null : toNumber(source.plan_id, 0),
    plan_name: source.plan_name ? String(source.plan_name) : null,
    credit_delta: source.credit_delta == null ? null : toNumber(source.credit_delta, 0),
    reference_label: source.reference_label ? String(source.reference_label) : null,
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

export const listTenantPaymentHistory = async (
  params: TenantPaymentHistoryParams = {},
): Promise<TenantPaymentHistoryDetail> => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.search && params.search.trim()) search.set('search', params.search.trim())
  if (params.category && params.category.trim()) search.set('category', params.category.trim())
  if (params.sortDir && String(params.sortDir).trim()) search.set('sortDir', String(params.sortDir).trim())

  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_PAYMENTS_ENDPOINT}/history?${search.toString()}`,
  )
  const data = toRecord(payload.data)
  const pagination = toRecord(data.pagination)
  const sort = toRecord(data.sort)
  const filters = toRecord(data.filters)

  return {
    sort: {
      by: String(sort.by ?? 'occurred_at'),
      dir: String(sort.dir ?? 'desc'),
    },
    filters: {
      category: String(filters.category ?? 'all'),
      search: String(filters.search ?? ''),
    },
    items: extractList(data.items).map(normalizeHistoryItem),
    pagination: {
      current_page: toNumber(pagination.current_page, 1),
      last_page: toNumber(pagination.last_page, 1),
      per_page: toNumber(pagination.per_page, 10),
      total: toNumber(pagination.total, 0),
    },
  }
}
