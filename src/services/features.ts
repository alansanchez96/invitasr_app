import { request } from '@/services/http'

export type FeatureListParams = {
  status?: '' | 'active' | 'inactive'
  type?: '' | 'boolean' | 'limit' | 'config'
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type FeatureListItem = {
  id?: number | string
  key?: string
  description?: string
  type?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export type FeatureDetail = FeatureListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<FeatureListItem> | FeatureListItem[] | Record<string, unknown>
  features?: FeatureListItem[]
  list?: FeatureListItem[]
  items?: FeatureListItem[]
  rows?: FeatureListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: FeatureDetail
  feature?: FeatureDetail
}

type MutationResponse = {
  status?: boolean
  message?: string
  data?: FeatureDetail
  feature?: FeatureDetail
}

const MASTER_FEATURES_ENDPOINT = '/master/features'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'features']
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

const normalizeFeatureItem = (value: unknown): FeatureListItem => {
  const source = toRecord(value)

  return {
    id: (source.id ?? source.feature_id) as number | string | undefined,
    key: source.key as string | undefined,
    description: source.description as string | undefined,
    type: source.type as string | undefined,
    status: source.status as string | undefined,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
  }
}

const buildQuery = (params: FeatureListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.status?.trim()) search.set('status', params.status)
  if (params.type?.trim()) search.set('type', params.type)
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)

  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listFeatures = async (params: FeatureListParams) => {
  const payload = await request<ListResponse>(`${MASTER_FEATURES_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeFeatureItem)

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

export const getFeature = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_FEATURES_ENDPOINT}/${id}`)
  return payload.data ?? payload.feature ?? payload
}

export type CreateFeatureInput = {
  key: string
  description: string
  type: 'boolean' | 'limit' | 'config'
  status?: 'active' | 'inactive'
}

export type UpdateFeatureInput = {
  key?: string
  description?: string
  type?: 'boolean' | 'limit' | 'config'
}

const resolveFeatureMutation = (payload: MutationResponse | FeatureDetail) =>
  (payload as MutationResponse).data ??
  (payload as MutationResponse).feature ??
  payload

export const createFeature = async (body: CreateFeatureInput) => {
  const payload = await request<MutationResponse>(MASTER_FEATURES_ENDPOINT, {
    method: 'POST',
    body,
  })
  return resolveFeatureMutation(payload)
}

export const updateFeature = async (id: string | number, body: UpdateFeatureInput) => {
  const payload = await request<MutationResponse>(`${MASTER_FEATURES_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return resolveFeatureMutation(payload)
}

export const updateFeatureStatus = async (id: string | number, status: 'active' | 'inactive') => {
  const payload = await request<MutationResponse>(`${MASTER_FEATURES_ENDPOINT}/${id}/status`, {
    method: 'PUT',
    body: { status },
  })
  return resolveFeatureMutation(payload)
}

export const deleteFeature = async (id: string | number) => {
  return request<MutationResponse>(`${MASTER_FEATURES_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
}
