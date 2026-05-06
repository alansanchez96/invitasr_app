import { request } from '@/services/http'

export type ProductUpdateStatus = 'draft' | 'published' | 'archived' | ''

export type ProductUpdateItem = {
  id: number
  version: string
  title: string
  summary: string
  body: string | null
  changes: string[]
  status: ProductUpdateStatus
  published_at: string | null
  notified_at: string | null
  notification_sent_count: number
  created_at: string | null
  updated_at: string | null
}

export type ProductUpdateListParams = {
  page?: number
  perPage?: number
  search?: string
  status?: ProductUpdateStatus
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type ProductUpdatePayload = {
  version: string
  title: string
  summary: string
  body?: string | null
  changes?: string[]
  status?: Exclude<ProductUpdateStatus, ''>
  published_at?: string | null
}

export type ProductUpdateListResult = {
  items: ProductUpdateItem[]
  page: number
  lastPage: number
  perPage: number
  total: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

type ApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const MASTER_ENDPOINT = '/master/product-updates'
const PUBLIC_ENDPOINT = '/catalogs/product-updates'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  const source = toRecord(value)
  for (const key of ['items', 'data', 'rows', 'list', 'product_updates']) {
    if (Array.isArray(source[key])) return source[key] as unknown[]
  }
  return []
}

const normalizeChanges = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

const normalizeItem = (value: unknown): ProductUpdateItem => {
  const source = toRecord(value)
  return {
    id: toNumber(source.id, 0),
    version: String(source.version ?? ''),
    title: String(source.title ?? ''),
    summary: String(source.summary ?? ''),
    body: source.body == null ? null : String(source.body),
    changes: normalizeChanges(source.changes),
    status: (source.status ? String(source.status) : 'draft') as ProductUpdateStatus,
    published_at: source.published_at ? String(source.published_at) : null,
    notified_at: source.notified_at ? String(source.notified_at) : null,
    notification_sent_count: toNumber(source.notification_sent_count, 0),
    created_at: source.created_at ? String(source.created_at) : null,
    updated_at: source.updated_at ? String(source.updated_at) : null,
  }
}

const buildQuery = (params: ProductUpdateListParams = {}) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))
  if (params.search?.trim()) search.set('search', params.search.trim())
  if (params.status?.trim()) search.set('status', params.status.trim())
  if (params.orderField?.trim()) search.set('orderField', params.orderField.trim())
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)
  return `?${search.toString()}`
}

const normalizeList = (payload: ApiResponse<Record<string, unknown>>): ProductUpdateListResult => {
  const data = toRecord(payload.data)
  const pagination = toRecord(data.pagination)
  const sort = toRecord(data.sort)
  return {
    items: extractList(data).map(normalizeItem),
    page: toNumber(pagination.current_page, 1) || 1,
    lastPage: toNumber(pagination.last_page, 1) || 1,
    perPage: toNumber(pagination.per_page, 10) || 10,
    total: toNumber(pagination.total, 0),
    orderField: sort.by ? String(sort.by) : undefined,
    orderDirection: sort.dir === 'asc' || sort.dir === 'desc' ? sort.dir : undefined,
  }
}

export const listPublicProductUpdates = async (
  params: ProductUpdateListParams = {},
): Promise<ProductUpdateListResult> => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${PUBLIC_ENDPOINT}${buildQuery(params)}`)
  return normalizeList(payload)
}

export const listMasterProductUpdates = async (
  params: ProductUpdateListParams = {},
): Promise<ProductUpdateListResult> => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${MASTER_ENDPOINT}${buildQuery(params)}`)
  return normalizeList(payload)
}

export const createProductUpdate = async (body: ProductUpdatePayload) => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(MASTER_ENDPOINT, {
    method: 'POST',
    body,
  })
  return {
    message: payload.message ?? 'Actualización creada.',
    item: normalizeItem(payload.data),
  }
}

export const updateProductUpdate = async (id: number | string, body: Partial<ProductUpdatePayload>) => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${MASTER_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return {
    message: payload.message ?? 'Actualización guardada.',
    item: normalizeItem(payload.data),
  }
}

export const deleteProductUpdate = async (id: number | string) => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${MASTER_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
  return {
    message: payload.message ?? 'Actualización eliminada.',
  }
}

export const notifyProductUpdate = async (id: number | string) => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(`${MASTER_ENDPOINT}/${id}/notify`, {
    method: 'POST',
  })
  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Actualización notificada.',
    sent: toNumber(data.sent, 0),
    item: normalizeItem(data.product_update),
  }
}
