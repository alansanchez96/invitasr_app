import { request } from '@/services/http'

export type SubscriptionListParams = {
  client_id?: number | string
  status?: string
  provider?: string
  date_from?: string
  date_to?: string
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type SubscriptionListItem = {
  id?: number | string
  client_id?: number | string
  plan_id?: number | string
  status?: string
  current_period_start?: string
  current_period_end?: string
  provider?: string
  provider_subscription_id?: string
  provider_customer_id?: string
  cancel_at_period_end?: boolean | number
  canceled_at?: string | null
  created_at?: string
  updated_at?: string
  client_name?: string
  client_label?: string
  client_country?: string
  plan_name?: string
  plan_billing_type?: string
}

export type SubscriptionDetail = SubscriptionListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<SubscriptionListItem> | SubscriptionListItem[] | Record<string, unknown>
  subscriptions?: SubscriptionListItem[]
  list?: SubscriptionListItem[]
  items?: SubscriptionListItem[]
  rows?: SubscriptionListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: SubscriptionDetail
  subscription?: SubscriptionDetail
}

const MASTER_SUBSCRIPTIONS_ENDPOINT = '/master/subscriptions'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'subscriptions']
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

const normalizeSubscriptionItem = (value: unknown): SubscriptionListItem => {
  const source = toRecord(value)
  const client = toRecord(source.client)
  const plan = toRecord(source.plan)

  return {
    id: (source.id ?? source.subscription_id) as number | string | undefined,
    client_id: (source.client_id ?? client.id ?? source.clientId) as number | string | undefined,
    plan_id: (source.plan_id ?? plan.id ?? source.planId) as number | string | undefined,
    status: source.status as string | undefined,
    current_period_start: source.current_period_start as string | undefined,
    current_period_end: source.current_period_end as string | undefined,
    provider: source.provider as string | undefined,
    provider_subscription_id: source.provider_subscription_id as string | undefined,
    provider_customer_id: source.provider_customer_id as string | undefined,
    cancel_at_period_end: source.cancel_at_period_end as boolean | number | undefined,
    canceled_at: source.canceled_at as string | null | undefined,
    created_at: source.created_at as string | undefined,
    updated_at: source.updated_at as string | undefined,
    client_name: (client.client_name ?? client.name ?? source.client_name) as string | undefined,
    client_label: (client.client_name ?? client.name ?? source.client_label) as string | undefined,
    client_country: (client.country_code ?? source.country_code) as string | undefined,
    plan_name: (plan.name ?? source.plan_name) as string | undefined,
    plan_billing_type: (plan.billing_type ?? source.plan_type) as string | undefined,
  }
}

const buildQuery = (params: SubscriptionListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.client_id?.toString().trim()) search.set('client_id', String(params.client_id).trim())
  if (params.status?.trim()) search.set('status', params.status.trim())
  if (params.provider?.trim()) search.set('provider', params.provider.trim())
  if (params.date_from?.trim()) search.set('date_from', params.date_from.trim())
  if (params.date_to?.trim()) search.set('date_to', params.date_to.trim())
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listSubscriptions = async (params: SubscriptionListParams) => {
  const payload = await request<ListResponse>(`${MASTER_SUBSCRIPTIONS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeSubscriptionItem)

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

export const getSubscription = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_SUBSCRIPTIONS_ENDPOINT}/${id}`)
  return payload.data ?? payload.subscription ?? payload
}
