import { request } from '@/services/http'

export type PlanFeatureListParams = {
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type PlanFeatureItem = {
  plan_id?: number | string
  plan_name?: string
  plan_status?: string
  plan_billing_type?: string
  feature_id?: number | string
  feature_key?: string
  feature_type?: string
  feature_description?: string
  status?: string
  limit?: number | null
  config?: unknown
}

export type PlanFeatureDetail = PlanFeatureItem & Record<string, unknown>

type ListResponse = {
  status?: boolean
  data?: unknown
  list?: unknown[]
  items?: unknown[]
  rows?: unknown[]
  pagination?: Record<string, unknown>
  meta?: Record<string, unknown>
}

type MutationResponse = {
  status?: boolean
  message?: string
  data?: PlanFeatureDetail
  item?: PlanFeatureDetail
}

const MASTER_PLANS_ENDPOINT = '/master/plans'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const parseLimit = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseConfig = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const source = value as Record<string, unknown>
  const directKeys = ['data', 'list', 'items', 'rows']
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

const normalizePlanFeatureItem = (value: unknown): PlanFeatureItem => {
  const source = toRecord(value)
  const plan = toRecord(source.plan)
  const feature = toRecord(source.feature)

  return {
    plan_id: (source.plan_id ?? plan.id) as number | string | undefined,
    plan_name: (source.plan_name ?? plan.name) as string | undefined,
    plan_status: (source.plan_status ?? plan.status) as string | undefined,
    plan_billing_type: (source.plan_billing_type ?? plan.billing_type ?? plan.billingType) as string | undefined,
    feature_id: (source.feature_id ?? feature.id) as number | string | undefined,
    feature_key: (source.feature_key ?? feature.key) as string | undefined,
    feature_type: (source.feature_type ?? feature.type) as string | undefined,
    feature_description: (source.feature_description ?? feature.description) as string | undefined,
    status: source.status as string | undefined,
    limit: parseLimit(source.limit),
    config: parseConfig(source.config),
  }
}

const buildQuery = (params: PlanFeatureListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)

  const query = search.toString()
  return query ? `?${query}` : ''
}

const resolvePlanFeatureMutation = (payload: MutationResponse | PlanFeatureDetail) =>
  (payload as MutationResponse).data ??
  (payload as MutationResponse).item ??
  payload

export const listPlanFeatures = async (planId: string | number, params: PlanFeatureListParams) => {
  const payload = await request<ListResponse>(`${MASTER_PLANS_ENDPOINT}/${planId}/features${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizePlanFeatureItem)

  const paginationSource = toRecord(
    toRecord(dataSource).pagination ??
      toRecord(dataSource).meta ??
      payload.pagination ??
      payload.meta ??
      dataSource,
  )

  const page = toNumber(
    paginationSource.current_page ?? paginationSource.currentPage ?? paginationSource.page,
    params.page ?? 1,
  )
  const lastPage = toNumber(paginationSource.last_page ?? paginationSource.lastPage ?? 1, 1)
  const perPage = toNumber(paginationSource.per_page ?? paginationSource.perPage, params.perPage ?? 10)
  const total = toNumber(paginationSource.total, list.length)

  return {
    list,
    page,
    lastPage,
    perPage,
    total,
  }
}

export type CreatePlanFeatureInput = {
  feature_id: string | number
  status?: 'active' | 'inactive'
  limit?: number | null
  config?: unknown
}

export type UpdatePlanFeatureInput = {
  status?: 'active' | 'inactive'
  limit?: number | null
  config?: unknown
}

export const createPlanFeature = async (planId: string | number, body: CreatePlanFeatureInput) => {
  const payload = await request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${planId}/features`, {
    method: 'POST',
    body,
  })
  return resolvePlanFeatureMutation(payload)
}

export const updatePlanFeature = async (
  planId: string | number,
  featureId: string | number,
  body: UpdatePlanFeatureInput,
) => {
  const payload = await request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${planId}/features/${featureId}`, {
    method: 'PUT',
    body,
  })
  return resolvePlanFeatureMutation(payload)
}

export const deletePlanFeature = async (planId: string | number, featureId: string | number) => {
  return request<MutationResponse>(`${MASTER_PLANS_ENDPOINT}/${planId}/features/${featureId}`, {
    method: 'DELETE',
  })
}
