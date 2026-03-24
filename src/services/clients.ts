import { request } from '@/services/http'

export type ClientStatus = 'active' | 'inactive' | ''

export type ClientListParams = {
  status?: ClientStatus
  country_code?: string
  client_name?: string
  db_name?: string
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type ClientListItem = {
  id?: number | string
  client_id?: number | string
  client_name?: string
  name?: string
  email?: string
  status?: string
  country_code?: string
  db_name?: string
  created_at?: string
}

export type ClientDetail = ClientListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<ClientListItem> | ClientListItem[] | Record<string, unknown>
  clients?: ClientListItem[]
  list?: ClientListItem[]
  items?: ClientListItem[]
  rows?: ClientListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: ClientDetail
  client?: ClientDetail
}

type UpdateResponse = {
  status?: boolean
  message?: string
  data?: ClientDetail
  client?: ClientDetail
}

const MASTER_CLIENTS_ENDPOINT = '/master/clients'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'clients']
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

const normalizeClientItem = (value: unknown): ClientListItem => {
  const source = toRecord(value)
  const nestedClient = toRecord(source.client)
  const merged = { ...source, ...nestedClient }

  return {
    id: (merged.id ?? merged.client_id ?? merged.clientId) as number | string | undefined,
    client_id: (merged.client_id ?? merged.clientId ?? merged.id) as number | string | undefined,
    client_name: (merged.client_name ?? merged.clientName ?? merged.name) as string | undefined,
    name: (merged.name ?? merged.client_name ?? merged.clientName) as string | undefined,
    email: merged.email as string | undefined,
    status: merged.status as string | undefined,
    country_code: (merged.country_code ?? merged.countryCode) as string | undefined,
    db_name: (merged.db_name ?? merged.dbName) as string | undefined,
    created_at: (merged.created_at ?? merged.createdAt) as string | undefined,
  }
}

const buildQuery = (params: ClientListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.status && params.status.trim()) search.set('status', params.status)
  if (params.country_code?.trim()) search.set('country_code', params.country_code.trim())
  if (params.client_name?.trim()) search.set('client_name', params.client_name.trim())
  if (params.db_name?.trim()) search.set('db_name', params.db_name.trim())
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listClients = async (params: ClientListParams) => {
  const payload = await request<ListResponse>(`${MASTER_CLIENTS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeClientItem)

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

export const getClient = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_CLIENTS_ENDPOINT}/${id}`)
  return payload.data ?? payload.client ?? payload
}

export const updateClientStatus = async (id: string | number, status: 'active' | 'inactive') => {
  const payload = await request<UpdateResponse>(`${MASTER_CLIENTS_ENDPOINT}/${id}/status`, {
    method: 'PUT',
    body: { status },
  })
  return payload.data ?? payload.client ?? payload
}
