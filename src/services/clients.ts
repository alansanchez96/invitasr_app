import { request } from '@/services/http'

export type ClientStatus = 'active' | 'inactive' | ''

export type ClientListParams = {
  status?: ClientStatus
  country_code?: string
  client_name?: string
  db_name?: string
  client_id?: string
  page?: number
  perPage?: number
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
  data?: Paginated<ClientListItem> | ClientListItem[]
  clients?: ClientListItem[]
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

const buildQuery = (params: ClientListParams) => {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.country_code) search.set('country_code', params.country_code)
  if (params.client_name) search.set('client_name', params.client_name)
  if (params.db_name) search.set('db_name', params.db_name)
  if (params.client_id) search.set('client_id', params.client_id)
  if (params.page) search.set('page', String(params.page))
  if (params.perPage) search.set('perPage', String(params.perPage))
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listClients = async (params: ClientListParams) => {
  const payload = await request<ListResponse>(`/master/clients${buildQuery(params)}`)
  const data = payload.data ?? payload.clients ?? []
  const list = Array.isArray(data) ? data : data.data ?? []
  const page = Array.isArray(data) ? params.page ?? 1 : data.current_page ?? params.page ?? 1
  const lastPage = Array.isArray(data) ? page : data.last_page ?? page
  const perPage = Array.isArray(data) ? params.perPage ?? 10 : data.per_page ?? params.perPage ?? 10
  const total = Array.isArray(data) ? list.length : data.total ?? list.length
  return { list, page, lastPage, perPage, total }
}

export const getClient = async (id: string | number) => {
  const payload = await request<GetResponse>(`/master/clients/${id}`)
  return payload.data ?? payload.client ?? payload
}

export const updateClientStatus = async (id: string | number, status: 'active' | 'inactive') => {
  const payload = await request<UpdateResponse>(`/master/clients/${id}`, {
    method: 'PUT',
    body: { status },
  })
  return payload.data ?? payload.client ?? payload
}
