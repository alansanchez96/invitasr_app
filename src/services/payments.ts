import { request } from '@/services/http'

export type PaymentListParams = {
  client_id?: number | string
  status?: string
  provider?: string
  type?: string
  date_from?: string
  date_to?: string
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type PaymentListItem = {
  id?: number | string
  client_id?: number | string
  plan_id?: number | string
  amount?: string
  currency?: string
  status?: string
  type?: string
  purchase_kind?: string | null
  purchase_category?: string | null
  purchase_label?: string
  purchase_description?: string
  credit_quantity?: number | string | null
  discount_percent?: number | string | null
  provider?: string
  provider_payment_id?: string
  provider_subscription_id?: string | null
  provider_customer_id?: string
  paid_at?: string | null
  created_at?: string
  updated_at?: string
  client_name?: string
  client_label?: string
  client_country?: string
  plan_name?: string
  plan_billing_type?: string
}

export type PaymentDetail = PaymentListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<PaymentListItem> | PaymentListItem[] | Record<string, unknown>
  payments?: PaymentListItem[]
  list?: PaymentListItem[]
  items?: PaymentListItem[]
  rows?: PaymentListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: PaymentDetail
  payment?: PaymentDetail
}

type CheckoutResponse = {
  status?: boolean | number
  message?: string
  data?: Record<string, unknown>
  checkout_url?: string
  url?: string
}

export type PaymentCheckoutResult = {
  message: string
  checkout_url?: string
  provider?: string
  payment_id?: number | string
  plan_id?: number | string
}

const MASTER_PAYMENTS_ENDPOINT = '/master/payments'
const PAYMENTS_CHECKOUT_ENDPOINT = '/payments/checkout'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const source = value as Record<string, unknown>
  const directKeys = ['data', 'list', 'items', 'rows', 'payments']
  for (const key of directKeys) {
    if (Array.isArray(source[key])) {
      return source[key] as unknown[]
    }
  }

  const nestedKeys = ['data', 'result', 'payload', 'meta']
  for (const key of nestedKeys) {
    const nested = source[key]
    const list = extractList(nested)
    if (list.length) return list
  }

  return []
}

const normalizePaymentItem = (value: unknown): PaymentListItem => {
  const source = toRecord(value)
  const client = toRecord(source.client)
  const plan = toRecord(source.plan)

  return {
    id: (source.id ?? source.payment_id) as number | string | undefined,
    client_id: (source.client_id ?? client.id ?? source.clientId) as number | string | undefined,
    plan_id: (source.plan_id ?? plan.id ?? source.planId) as number | string | undefined,
    amount: (source.amount ?? source.total ?? source.value) as string | undefined,
    currency: (source.currency ?? source.currency_code) as string | undefined,
    status: source.status as string | undefined,
    type: source.type as string | undefined,
    purchase_kind: source.purchase_kind as string | null | undefined,
    purchase_category: source.purchase_category as string | null | undefined,
    purchase_label: source.purchase_label as string | undefined,
    purchase_description: source.purchase_description as string | undefined,
    credit_quantity: source.credit_quantity as number | string | null | undefined,
    discount_percent: source.discount_percent as number | string | null | undefined,
    provider: source.provider as string | undefined,
    provider_payment_id: source.provider_payment_id as string | undefined,
    provider_subscription_id: source.provider_subscription_id as string | null | undefined,
    provider_customer_id: source.provider_customer_id as string | undefined,
    paid_at: source.paid_at as string | null | undefined,
    created_at: source.created_at as string | undefined,
    updated_at: source.updated_at as string | undefined,
    client_name: (client.client_name ?? client.name ?? source.client_name) as string | undefined,
    client_label: (client.client_name ?? client.name ?? source.client_label) as string | undefined,
    client_country: (client.country_code ?? source.country_code) as string | undefined,
    plan_name: (plan.name ?? source.plan_name) as string | undefined,
    plan_billing_type: (plan.billing_type ?? source.plan_type) as string | undefined,
  }
}

const buildQuery = (params: PaymentListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.client_id?.toString().trim()) search.set('client_id', String(params.client_id).trim())
  if (params.status?.trim()) search.set('status', params.status.trim())
  if (params.provider?.trim()) search.set('provider', params.provider.trim())
  if (params.type?.trim()) search.set('type', params.type.trim())
  if (params.date_from?.trim()) search.set('date_from', params.date_from.trim())
  if (params.date_to?.trim()) search.set('date_to', params.date_to.trim())
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listPayments = async (params: PaymentListParams) => {
  const payload = await request<ListResponse>(`${MASTER_PAYMENTS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizePaymentItem)

  const paginationSource = toRecord(
    toRecord(dataSource).pagination ?? toRecord(dataSource).meta ?? dataSource,
  )
  const page = toNumber(
    paginationSource.current_page ?? paginationSource.currentPage ?? paginationSource.page,
    params.page ?? 1,
  )
  const lastPage = toNumber(
    paginationSource.last_page ?? paginationSource.lastPage ?? page,
    page,
  )
  const perPage = toNumber(
    paginationSource.per_page ?? paginationSource.perPage,
    params.perPage ?? 10,
  )
  const total = toNumber(paginationSource.total, list.length)
  const orderField =
    (paginationSource.orderField ?? paginationSource.order_by ?? paginationSource.sort_by) as
      | string
      | undefined
  const orderDirection =
    (paginationSource.orderDirection ?? paginationSource.order_direction ?? paginationSource.sort_direction) as
      | 'asc'
      | 'desc'
      | undefined

  return { list, page, lastPage, perPage, total, orderField, orderDirection }
}

export const getPayment = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_PAYMENTS_ENDPOINT}/${id}`)
  return payload.data ?? payload.payment ?? payload
}

export const checkoutPayment = async (planId: string | number): Promise<PaymentCheckoutResult> => {
  const payload = await request<CheckoutResponse>(PAYMENTS_CHECKOUT_ENDPOINT, {
    method: 'POST',
    body: { plan_id: planId },
  })

  const data = toRecord(payload.data ?? payload)
  return {
    message: payload.message ?? 'Checkout inicializado.',
    checkout_url: (data.checkout_url ?? data.url ?? payload.checkout_url ?? payload.url) as string | undefined,
    provider: data.provider as string | undefined,
    payment_id: (data.payment_id ?? data.id) as number | string | undefined,
    plan_id: data.plan_id as number | string | undefined,
  }
}
