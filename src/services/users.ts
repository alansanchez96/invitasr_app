import { request } from '@/services/http'

export type UserListParams = {
  client_id?: number | string
  email?: string
  name?: string
  last_name?: string
  is_master?: '' | 'true' | 'false'
  search?: string
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type UserListItem = {
  id?: number | string
  client_id?: number | string
  email?: string
  name?: string
  last_name?: string
  is_master?: boolean
  created_at?: string
  client_label?: string
}

export type UserDetail = UserListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<UserListItem> | UserListItem[] | Record<string, unknown>
  users?: UserListItem[]
  list?: UserListItem[]
  items?: UserListItem[]
  rows?: UserListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: UserDetail
  user?: UserDetail
}

type UpdateResponse = {
  status?: boolean
  message?: string
  data?: UserDetail
  user?: UserDetail
}

const MASTER_USERS_ENDPOINT = '/master/users'

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
  const directKeys = ['data', 'list', 'items', 'rows', 'users']
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

const normalizeUserItem = (value: unknown): UserListItem => {
  const source = toRecord(value)
  const nestedUser = toRecord(source.user)
  const merged = { ...source, ...nestedUser }

  return {
    id: (merged.id ?? merged.user_id ?? merged.client_id) as number | string | undefined,
    client_id: (merged.client_id ?? merged.user_id ?? merged.id) as number | string | undefined,
    email: merged.email as string | undefined,
    name: (merged.name ?? merged.first_name) as string | undefined,
    last_name: (merged.last_name ?? merged.lastName) as string | undefined,
    is_master: typeof merged.is_master === 'boolean' ? merged.is_master : undefined,
    created_at: (merged.created_at ?? merged.createdAt) as string | undefined,
    client_label: (merged.client_label ?? merged.clientName) as string | undefined,
  }
}

const buildQuery = (params: UserListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.client_id?.toString().trim()) search.set('client_id', String(params.client_id).trim())
  if (params.email?.trim()) search.set('email', params.email.trim())
  if (params.name?.trim()) search.set('name', params.name.trim())
  if (params.last_name?.trim()) search.set('last_name', params.last_name.trim())
  if (params.is_master && params.is_master.trim()) search.set('is_master', params.is_master)
  if (params.search?.trim()) search.set('search', params.search.trim())
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listUsers = async (params: UserListParams) => {
  const payload = await request<ListResponse>(`${MASTER_USERS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeUserItem)

  const paginationSource = toRecord(
    toRecord(dataSource).pagination ?? toRecord(dataSource).meta ?? dataSource,
  )
  const page = toNumber(paginationSource.current_page ?? paginationSource.currentPage ?? paginationSource.page, params.page ?? 1)
  const lastPage = toNumber(
    paginationSource.last_page ?? paginationSource.lastPage ?? page,
    page,
  )
  const perPage = toNumber(paginationSource.per_page ?? paginationSource.perPage, params.perPage ?? 10)
  const total = toNumber(paginationSource.total, list.length)
  const orderField = (paginationSource.orderField ??
    paginationSource.order_by ??
    paginationSource.sort_by) as string | undefined
  const orderDirection = (paginationSource.orderDirection ??
    paginationSource.order_direction ??
    paginationSource.sort_direction) as 'asc' | 'desc' | undefined

  return { list, page, lastPage, perPage, total, orderField, orderDirection }
}

export const getUser = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_USERS_ENDPOINT}/${id}`)
  return payload.data ?? payload.user ?? payload
}

export const updateUser = async (id: string | number, body: Record<string, unknown>) => {
  const payload = await request<UpdateResponse>(`${MASTER_USERS_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return payload.data ?? payload.user ?? payload
}
