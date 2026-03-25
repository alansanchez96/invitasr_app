import { request } from '@/services/http'

export type PlanListParams = {
  status?: '' | 'active' | 'inactive'
  billing_type?: '' | 'one_time' | 'subscription'
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type PlanListItem = {
  id?: number | string
  name?: string
  status?: string
  billing_type?: string
  event_credits?: number | null
  credit_expiration_days?: number | null
  price_usd?: number | string | null
  created_at?: string
  updated_at?: string
  features?: unknown[]
}

export type PlanDetail = PlanListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<PlanListItem> | PlanListItem[] | Record<string, unknown>
  plans?: PlanListItem[]
  list?: PlanListItem[]
  items?: PlanListItem[]
  rows?: PlanListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: PlanDetail
  plan?: PlanDetail
}

type MutationResponse = {
  status?: boolean
  message?: string
  data?: PlanDetail
  plan?: PlanDetail
}

const MASTER_PLANS_ENDPOINT = '/master/plans'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'plans']
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

const normalizePlanItem = (value: unknown): PlanListItem => {
  const source = toRecord(value)

  return {
    id: source.id as number | string | undefined,
    name: (source.name ?? source.title) as string | undefined,
    status: source.status as string | undefined,
    billing_type: (source.billing_type ?? source.billingType) as string | undefined,
    event_credits: (source.event_credits ?? source.eventCredits ?? null) as number | null,
    credit_expiration_days: (source.credit_expiration_days ?? source.creditExpirationDays ?? null) as number | null,
    price_usd: (source.price_usd ?? source.priceUsd ?? null) as number | string | null,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
    features: Array.isArray(source.features) ? (source.features as unknown[]) : [],
  }
}

const buildQuery = (params: PlanListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.status?.trim()) search.set('status', params.status)
  if (params.billing_type?.trim()) search.set('billing_type', params.billing_type)
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)

  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listPlans = async (params: PlanListParams) => {
  const payload = await request<ListResponse>(`${MASTER_PLANS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizePlanItem)

  const paginationSource = toRecord(
    toRecord(dataSource).pagination ?? toRecord(dataSource).meta ?? dataSource,
  )
  const page = toNumber(
    paginationSource.current_page ?? paginationSource.currentPage ?? paginationSource.page,
    params.page ?? 1,
  )
  const lastPage = toNumber(paginationSource.last_page ?? paginationSource.lastPage ?? page, page)
  const perPage = toNumber(paginationSource.per_page ?? paginationSource.perPage, params.perPage ?? 10)
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

export const getPlan = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_PLANS_ENDPOINT}/${id}`)
  return payload.data ?? payload.plan ?? payload
}

export type CreatePlanInput = {
  name: string
  status?: 'active' | 'inactive'
  billing_type?: 'one_time' | 'subscription'
  event_credits?: number | null
  credit_expiration_days?: number | null
  price_usd?: number | null
}

export type UpdatePlanInput = {
  name?: string
  billing_type?: 'one_time' | 'subscription'
  event_credits?: number | null
  credit_expiration_days?: number | null
  price_usd?: number | null
}

const resolvePlanMutation = (payload: MutationResponse | PlanDetail) =>
  (payload as MutationResponse).data ??
  (payload as MutationResponse).plan ??
  payload

export const createPlan = async (body: CreatePlanInput) => {
  const payload = await request<MutationResponse>(MASTER_PLANS_ENDPOINT, {
    method: 'POST',
    body,
  })
  return resolvePlanMutation(payload)
}

export const updatePlan = async (id: string | number, body: UpdatePlanInput) => {
  const payload = await request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return resolvePlanMutation(payload)
}

export const updatePlanStatus = async (id: string | number, status: 'active' | 'inactive') => {
  const payload = await request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${id}/status`, {
    method: 'PUT',
    body: { status },
  })
  return resolvePlanMutation(payload)
}

export const deletePlan = async (id: string | number) => {
  return request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
}
