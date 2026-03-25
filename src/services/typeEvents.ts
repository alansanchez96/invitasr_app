import { request } from '@/services/http'

export type TypeEventListParams = {
  status?: '' | 'active' | 'inactive'
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type TypeEventListItem = {
  id?: number | string
  name?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export type TypeEventDetail = TypeEventListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<TypeEventListItem> | TypeEventListItem[] | Record<string, unknown>
  type_events?: TypeEventListItem[]
  typeEvents?: TypeEventListItem[]
  list?: TypeEventListItem[]
  items?: TypeEventListItem[]
  rows?: TypeEventListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: TypeEventDetail
  type_event?: TypeEventDetail
}

type MutationResponse = {
  status?: boolean
  message?: string
  data?: TypeEventDetail
  type_event?: TypeEventDetail
}

const MASTER_TYPE_EVENTS_ENDPOINT = '/master/type-events'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'type_events', 'typeEvents']
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

const normalizeTypeEventItem = (value: unknown): TypeEventListItem => {
  const source = toRecord(value)

  return {
    id: (source.id ?? source.type_event_id) as number | string | undefined,
    name: source.name as string | undefined,
    status: source.status as string | undefined,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
  }
}

const buildQuery = (params: TypeEventListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.status?.trim()) search.set('status', params.status)
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)

  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listTypeEvents = async (params: TypeEventListParams) => {
  const payload = await request<ListResponse>(`${MASTER_TYPE_EVENTS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeTypeEventItem)

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

export const getTypeEvent = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_TYPE_EVENTS_ENDPOINT}/${id}`)
  return payload.data ?? payload.type_event ?? payload
}

export type CreateTypeEventInput = {
  name: string
  status?: 'active' | 'inactive'
}

export type UpdateTypeEventInput = {
  name?: string
}

const resolveTypeEventMutation = (payload: MutationResponse | TypeEventDetail) =>
  (payload as MutationResponse).data ??
  (payload as MutationResponse).type_event ??
  payload

export const createTypeEvent = async (body: CreateTypeEventInput) => {
  const payload = await request<MutationResponse>(MASTER_TYPE_EVENTS_ENDPOINT, {
    method: 'POST',
    body,
  })
  return resolveTypeEventMutation(payload)
}

export const updateTypeEvent = async (id: string | number, body: UpdateTypeEventInput) => {
  const payload = await request<MutationResponse>(`${MASTER_TYPE_EVENTS_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return resolveTypeEventMutation(payload)
}

export const updateTypeEventStatus = async (id: string | number, status: 'active' | 'inactive') => {
  const payload = await request<MutationResponse>(`${MASTER_TYPE_EVENTS_ENDPOINT}/${id}/status`, {
    method: 'PUT',
    body: { status },
  })
  return resolveTypeEventMutation(payload)
}

export const deleteTypeEvent = async (id: string | number) => {
  return request<MutationResponse>(`${MASTER_TYPE_EVENTS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
}
