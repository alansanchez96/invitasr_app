import { request } from '@/services/http'

export type CatalogPlanListParams = {
  name?: string
  billing_type?: string
  page?: number
  perPage?: number
}

export type CatalogTemplateListParams = {
  plan_id?: string | number
  type_event_id?: string | number
  name?: string
  page?: number
  perPage?: number
}

export type CatalogFeatureListParams = {
  key?: string
  type?: string
  page?: number
  perPage?: number
}

export type CatalogTypeEventListParams = {
  name?: string
  page?: number
  perPage?: number
}

export type CatalogPlanFeatureItem = {
  id?: number | string
  key?: string
  type?: string
  description?: string
  status?: string
  plan_id?: number | string
  feature_id?: number | string
  limit?: number | null
  config?: unknown
}

export type CatalogPlanListItem = {
  id?: number | string
  name?: string
  status?: string
  billing_type?: string
  event_credits?: number | null
  credit_expiration_days?: number | null
  price_usd?: number | string | null
  created_at?: string
  updated_at?: string
  features: CatalogPlanFeatureItem[]
}

export type CatalogTypeEventItem = {
  id?: number | string
  name?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export type CatalogTemplateItem = {
  id?: number | string
  plan_id?: number | string | null
  type_event_id?: number | string | null
  name?: string
  slug?: string
  renderer_key?: string
  preview_image?: string | null
  definition_version?: string | null
  definition?: Record<string, unknown> | null
  status?: string
  created_at?: string
  updated_at?: string
  plan?: CatalogPlanListItem | null
  type_event?: CatalogTypeEventItem | null
}

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse<T> = {
  status?: number | boolean
  message?: string
  data?: Paginated<T> | T[] | Record<string, unknown>
  list?: T[]
  items?: T[]
  rows?: T[]
  plans?: T[]
  features?: T[]
  templates?: T[]
  type_events?: T[]
  typeEvents?: T[]
  pagination?: Record<string, unknown>
}

type GetResponse<T> = {
  status?: number | boolean
  message?: string
  data?: T | Record<string, unknown>
  plan?: T
  feature?: T
  template?: T
  type_event?: T
}

const CATALOGS_BASE = '/catalogs'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const parseConfig = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const source = value as Record<string, unknown>
  const directKeys = ['data', 'list', 'items', 'rows', 'plans', 'features', 'templates', 'type_events', 'typeEvents']
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

const normalizeCatalogPlanFeature = (value: unknown): CatalogPlanFeatureItem => {
  const source = toRecord(value)
  const pivot = toRecord(source.pivot)
  const feature = toRecord(source.feature)
  const plan = toRecord(source.plan)

  return {
    id: (source.id ?? feature.id ?? source.feature_id ?? pivot.feature_id) as number | string | undefined,
    key: (source.key ?? feature.key) as string | undefined,
    type: (source.type ?? feature.type) as string | undefined,
    description: (source.description ?? feature.description) as string | undefined,
    status: (source.status ?? feature.status ?? pivot.status) as string | undefined,
    plan_id: (source.plan_id ?? plan.id ?? pivot.plan_id) as number | string | undefined,
    feature_id: (source.feature_id ?? feature.id ?? pivot.feature_id) as number | string | undefined,
    limit: (source.limit ?? pivot.limit ?? null) as number | null,
    config: parseConfig(source.config ?? pivot.config ?? null),
  }
}

const normalizeCatalogPlan = (value: unknown): CatalogPlanListItem => {
  const source = toRecord(value)

  return {
    id: source.id as number | string | undefined,
    name: source.name as string | undefined,
    status: source.status as string | undefined,
    billing_type: (source.billing_type ?? source.billingType) as string | undefined,
    event_credits: (source.event_credits ?? source.eventCredits ?? null) as number | null,
    credit_expiration_days: (source.credit_expiration_days ?? source.creditExpirationDays ?? null) as number | null,
    price_usd: (source.price_usd ?? source.priceUsd ?? null) as number | string | null,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
    features: Array.isArray(source.features) ? (source.features as unknown[]).map(normalizeCatalogPlanFeature) : [],
  }
}

const normalizeCatalogTypeEvent = (value: unknown): CatalogTypeEventItem => {
  const source = toRecord(value)

  return {
    id: (source.id ?? source.type_event_id) as number | string | undefined,
    name: source.name as string | undefined,
    status: source.status as string | undefined,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
  }
}

const normalizeCatalogTemplate = (value: unknown): CatalogTemplateItem => {
  const source = toRecord(value)

  return {
    id: source.id as number | string | undefined,
    plan_id: (source.plan_id ?? source.planId) as number | string | null | undefined,
    type_event_id: (source.type_event_id ?? source.typeEventId) as number | string | null | undefined,
    name: source.name as string | undefined,
    slug: source.slug as string | undefined,
    renderer_key: (source.renderer_key ?? source.rendererKey) as string | undefined,
    preview_image: (source.preview_image ?? source.previewImage ?? null) as string | null,
    definition_version: (source.definition_version ?? source.definitionVersion ?? null) as string | null,
    definition: Object.keys(toRecord(source.definition)).length ? toRecord(source.definition) : null,
    status: source.status as string | undefined,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
    plan: Object.keys(toRecord(source.plan)).length ? normalizeCatalogPlan(source.plan) : null,
    type_event: Object.keys(toRecord(source.type_event)).length ? normalizeCatalogTypeEvent(source.type_event) : null,
  }
}

const buildQuery = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const normalized = String(value).trim()
    if (!normalized) return
    search.set(key, normalized)
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

const parsePagination = (dataSource: unknown, fallbackPage = 1, fallbackPerPage = 10) => {
  const paginationSource = toRecord(
    toRecord(dataSource).pagination ?? toRecord(dataSource).meta ?? dataSource,
  )

  return {
    page: toNumber(paginationSource.current_page ?? paginationSource.currentPage ?? paginationSource.page, fallbackPage),
    lastPage: toNumber(paginationSource.last_page ?? paginationSource.lastPage ?? paginationSource.page, fallbackPage),
    perPage: toNumber(paginationSource.per_page ?? paginationSource.perPage, fallbackPerPage),
    total: toNumber(paginationSource.total, 0),
  }
}

export const listCatalogPlans = async (params: CatalogPlanListParams = {}) => {
  const payload = await request<ListResponse<CatalogPlanListItem>>(
    `${CATALOGS_BASE}/plans${buildQuery({
      name: params.name,
      billing_type: params.billing_type,
      page: params.page ?? 1,
      perPage: params.perPage ?? 10,
    })}`,
  )

  const dataSource = payload.data ?? payload
  const list = extractList(dataSource).map(normalizeCatalogPlan)
  return {
    list,
    ...parsePagination(dataSource, params.page ?? 1, params.perPage ?? 10),
  }
}

export const getCatalogPlan = async (planId: string | number) => {
  const payload = await request<GetResponse<CatalogPlanListItem>>(`${CATALOGS_BASE}/plans/${planId}`)
  return normalizeCatalogPlan(payload.data ?? payload.plan ?? payload)
}

export const listCatalogPlanFeatures = async (planId: string | number) => {
  const payload = await request<ListResponse<CatalogPlanFeatureItem>>(`${CATALOGS_BASE}/plans/${planId}/features`)
  const dataSource = payload.data ?? payload
  return extractList(dataSource).map(normalizeCatalogPlanFeature)
}

export const listCatalogFeatures = async (params: CatalogFeatureListParams = {}) => {
  const payload = await request<ListResponse<CatalogPlanFeatureItem>>(
    `${CATALOGS_BASE}/features${buildQuery({
      key: params.key,
      type: params.type,
      page: params.page ?? 1,
      perPage: params.perPage ?? 10,
    })}`,
  )

  const dataSource = payload.data ?? payload
  const list = extractList(dataSource).map(normalizeCatalogPlanFeature)
  return {
    list,
    ...parsePagination(dataSource, params.page ?? 1, params.perPage ?? 10),
  }
}

export const listCatalogTypeEvents = async (params: CatalogTypeEventListParams = {}) => {
  const payload = await request<ListResponse<CatalogTypeEventItem>>(
    `${CATALOGS_BASE}/type-events${buildQuery({
      name: params.name,
      page: params.page ?? 1,
      perPage: params.perPage ?? 10,
    })}`,
  )

  const dataSource = payload.data ?? payload
  const list = extractList(dataSource).map(normalizeCatalogTypeEvent)
  return {
    list,
    ...parsePagination(dataSource, params.page ?? 1, params.perPage ?? 10),
  }
}

export const listCatalogTemplates = async (params: CatalogTemplateListParams = {}) => {
  const payload = await request<ListResponse<CatalogTemplateItem>>(
    `${CATALOGS_BASE}/templates${buildQuery({
      plan_id: params.plan_id,
      type_event_id: params.type_event_id,
      name: params.name,
      page: params.page ?? 1,
      perPage: params.perPage ?? 50,
    })}`,
  )

  const dataSource = payload.data ?? payload
  const list = extractList(dataSource).map(normalizeCatalogTemplate)
  return {
    list,
    ...parsePagination(dataSource, params.page ?? 1, params.perPage ?? 50),
  }
}

export const getCatalogTemplate = async (templateId: string | number) => {
  const payload = await request<GetResponse<CatalogTemplateItem>>(`${CATALOGS_BASE}/templates/${templateId}`)
  return normalizeCatalogTemplate(payload.data ?? payload.template ?? payload)
}
