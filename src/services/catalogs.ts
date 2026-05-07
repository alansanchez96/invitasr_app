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

export type CatalogCountryListParams = {
  iso?: string
  name?: string
  phonecode?: string | number
  page?: number
  perPage?: number
}

export type CatalogPlanFeatureItem = {
  id?: number | string
  key?: string
  type?: string
  description?: string
  public_title?: string | null
  public_description?: string | null
  public_badge?: string | null
  public_priority?: number | null
  public_visible?: boolean
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

export type CatalogPlanComparisonPlan = {
  id?: number | string
  name?: string
  label?: string
  billing_type?: string
  price_usd?: number | string | null
  event_credits?: number | null
  credit_expiration_days?: number | null
}

export type CatalogPlanComparisonValue = {
  included: boolean
  raw_limit?: number | string | null
  display_value?: string | null
}

export type CatalogPlanComparisonItem = {
  key: string
  label: string
  description?: string | null
  category?: string | null
  display_type?: string | null
  badge?: string | null
  priority?: number | null
  values: Record<string, CatalogPlanComparisonValue>
}

export type CatalogPlanComparisonGroup = {
  key: string
  label: string
  order?: number
  items: CatalogPlanComparisonItem[]
}

export type CatalogPlanComparison = {
  plans: CatalogPlanComparisonPlan[]
  groups: CatalogPlanComparisonGroup[]
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

export type CatalogCountryItem = {
  id?: number | string
  iso?: string
  name?: string
  nicename?: string
  iso3?: string | null
  numcode?: number | null
  phonecode?: number | null
  created_at?: string
  updated_at?: string
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
  countries?: T[]
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
  country?: T
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
  const directKeys = ['data', 'list', 'items', 'rows', 'plans', 'features', 'templates', 'type_events', 'typeEvents', 'countries']
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
    public_title: (source.public_title ?? source.publicTitle ?? feature.public_title ?? feature.publicTitle ?? null) as string | null,
    public_description: (
      source.public_description
      ?? source.publicDescription
      ?? feature.public_description
      ?? feature.publicDescription
      ?? null
    ) as string | null,
    public_badge: (source.public_badge ?? source.publicBadge ?? feature.public_badge ?? feature.publicBadge ?? null) as string | null,
    public_priority: (source.public_priority ?? source.publicPriority ?? feature.public_priority ?? feature.publicPriority ?? null) as number | null,
    public_visible: (source.public_visible ?? source.publicVisible ?? feature.public_visible ?? feature.publicVisible ?? true) as boolean,
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

const normalizeComparisonValue = (value: unknown): CatalogPlanComparisonValue => {
  const source = toRecord(value)

  return {
    included: Boolean(source.included),
    raw_limit: (source.raw_limit ?? source.rawLimit ?? null) as number | string | null,
    display_value: (source.display_value ?? source.displayValue ?? null) as string | null,
  }
}

const normalizePlanComparison = (value: unknown): CatalogPlanComparison => {
  const source = toRecord(value)
  const plans = extractList(source.plans).map((plan) => {
    const record = toRecord(plan)
    return {
      id: record.id as number | string | undefined,
      name: record.name as string | undefined,
      label: record.label as string | undefined,
      billing_type: (record.billing_type ?? record.billingType) as string | undefined,
      price_usd: (record.price_usd ?? record.priceUsd ?? null) as number | string | null,
      event_credits: (record.event_credits ?? record.eventCredits ?? null) as number | null,
      credit_expiration_days: (record.credit_expiration_days ?? record.creditExpirationDays ?? null) as number | null,
    }
  })

  const groups = extractList(source.groups).map((group) => {
    const record = toRecord(group)
    return {
      key: String(record.key ?? record.label ?? ''),
      label: String(record.label ?? record.key ?? ''),
      order: Number(record.order ?? 0),
      items: extractList(record.items).map((item) => {
        const itemRecord = toRecord(item)
        const rawValues = toRecord(itemRecord.values)
        const values = Object.fromEntries(
          Object.entries(rawValues).map(([key, rawValue]) => [key, normalizeComparisonValue(rawValue)]),
        )

        return {
          key: String(itemRecord.key ?? ''),
          label: String(itemRecord.label ?? itemRecord.key ?? ''),
          description: (itemRecord.description ?? null) as string | null,
          category: (itemRecord.category ?? null) as string | null,
          display_type: (itemRecord.display_type ?? itemRecord.displayType ?? null) as string | null,
          badge: (itemRecord.badge ?? null) as string | null,
          priority: (itemRecord.priority ?? null) as number | null,
          values,
        }
      }),
    }
  })

  return { plans, groups }
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

const normalizeCatalogCountry = (value: unknown): CatalogCountryItem => {
  const source = toRecord(value)

  return {
    id: source.id as number | string | undefined,
    iso: source.iso as string | undefined,
    name: source.name as string | undefined,
    nicename: source.nicename as string | undefined,
    iso3: (source.iso3 ?? null) as string | null,
    numcode: (source.numcode ?? null) as number | null,
    phonecode: (source.phonecode ?? null) as number | null,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
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

export const getCatalogPlanComparison = async () => {
  const payload = await request<GetResponse<CatalogPlanComparison>>(`${CATALOGS_BASE}/plans/comparison`)
  return normalizePlanComparison(payload.data ?? payload)
}

export const listCatalogPlanFeatures = async (
  planId: string | number,
  params: { page?: number; perPage?: number } = {},
) => {
  const payload = await request<ListResponse<CatalogPlanFeatureItem>>(
    `${CATALOGS_BASE}/plans/${planId}/features${buildQuery({
      page: params.page ?? 1,
      perPage: params.perPage ?? 100,
    })}`,
  )
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

export const listCatalogCountries = async (params: CatalogCountryListParams = {}) => {
  const payload = await request<ListResponse<CatalogCountryItem>>(
    `${CATALOGS_BASE}/countries${buildQuery({
      iso: params.iso,
      name: params.name,
      phonecode: params.phonecode,
      page: params.page ?? 1,
      perPage: params.perPage ?? 300,
    })}`,
  )

  const dataSource = payload.data ?? payload
  const list = extractList(dataSource).map(normalizeCatalogCountry)
  return {
    list,
    ...parsePagination(dataSource, params.page ?? 1, params.perPage ?? 300),
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
