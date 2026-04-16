import { request } from '@/services/http'

export type OnboardingListParams = {
  status?: string
  payment_mode?: string
  page?: number
  perPage?: number
  orderField?: string
  orderDirection?: 'asc' | 'desc'
}

export type OnboardingListItem = {
  id?: number | string
  plan_id?: number | string
  client_id?: number | string
  access_token_id?: number | string
  type_event_id?: number | string | null
  template_id?: number | string | null
  payment_mode?: string
  status?: string
  expires_at?: string | null
  completed_at?: string | null
  created_by?: number | string | null
  created_at?: string
  updated_at?: string
  plan_name?: string
  client_name?: string
  client_country?: string
  creator_name?: string
  creator_email?: string
  token_short_code?: string
  token_expire?: string | null
  token_used?: boolean
  token_used_at?: string | null
}

export type OnboardingDetail = OnboardingListItem & Record<string, unknown>

type Paginated<T> = {
  data?: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

type ListResponse = {
  status?: boolean
  data?: Paginated<OnboardingListItem> | OnboardingListItem[] | Record<string, unknown>
  onboardings?: OnboardingListItem[]
  list?: OnboardingListItem[]
  items?: OnboardingListItem[]
  rows?: OnboardingListItem[]
  pagination?: Record<string, unknown>
}

type GetResponse = {
  status?: boolean
  data?: OnboardingDetail
  onboarding?: OnboardingDetail
}

type MutationResponse = {
  status?: boolean
  message?: string
  data?: OnboardingDetail
  onboarding?: OnboardingDetail
  token?: Record<string, unknown>
}

type PublicGetResponse = {
  status?: boolean
  message?: string
  data?: Record<string, unknown>
  onboarding?: Record<string, unknown>
}

type PublicCompleteResponse = {
  status?: boolean
  message?: string
  data?: Record<string, unknown>
  onboarding?: Record<string, unknown>
}

const MASTER_ONBOARDINGS_ENDPOINT = '/master/onboardings'
const PUBLIC_ONBOARDINGS_ENDPOINT = '/onboarding'

export type PublicOnboardingTemplate = {
  id?: number | string
  name: string
  description?: string
}

export type PublicOnboardingContext = OnboardingDetail & {
  code: string
  templates: PublicOnboardingTemplate[]
}

export type CompletePublicOnboardingInput = {
  register_method: 'email' | 'google' | 'facebook'
  full_name: string
  email: string
  password: string
  country_code: string
  template_id: number | string | null
  type_event_id: number | string | null
}

export type CompletePublicOnboardingResult = {
  message: string
  next_step?: string
  onboarding: OnboardingListItem | null
  registration: {
    full_name?: string
    email?: string
    country_code?: string
    register_method?: string
  } | null
  client: {
    id?: number | string
    client_name?: string
    country_code?: string | null
    status?: string | null
  } | null
  user: {
    id?: number | string
    name?: string
    last_name?: string
    email?: string
    is_master?: boolean
  } | null
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes'
  }
  return false
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const source = value as Record<string, unknown>
  const directKeys = ['data', 'list', 'items', 'rows', 'onboardings']
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

const normalizeOnboardingItem = (value: unknown): OnboardingListItem => {
  const source = toRecord(value)
  const plan = toRecord(source.plan)
  const client = toRecord(source.client)
  const creator = toRecord(source.creator)
  const token = toRecord(source.access_token ?? source.token)

  return {
    id: source.id as number | string | undefined,
    plan_id: (source.plan_id ?? plan.id) as number | string | undefined,
    client_id: (source.client_id ?? client.id) as number | string | undefined,
    access_token_id: (source.access_token_id ?? token.id) as number | string | undefined,
    type_event_id: (source.type_event_id ?? source.typeEventId) as number | string | null | undefined,
    template_id: (source.template_id ?? source.templateId) as number | string | null | undefined,
    payment_mode: source.payment_mode as string | undefined,
    status: source.status as string | undefined,
    expires_at: (source.expires_at ?? source.expiresAt) as string | null | undefined,
    completed_at: (source.completed_at ?? source.completedAt) as string | null | undefined,
    created_by: (source.created_by ?? source.createdBy) as number | string | null | undefined,
    created_at: (source.created_at ?? source.createdAt) as string | undefined,
    updated_at: (source.updated_at ?? source.updatedAt) as string | undefined,
    plan_name: (source.plan_name ?? plan.name) as string | undefined,
    client_name: (source.client_name ?? client.client_name ?? client.name) as string | undefined,
    client_country: (source.country_code ?? client.country_code) as string | undefined,
    creator_name:
      (source.creator_name ??
        [creator.name, creator.last_name]
          .filter((part) => typeof part === 'string' && part.trim())
          .join(' ')
          .trim()) as string | undefined,
    creator_email: (source.creator_email ?? creator.email) as string | undefined,
    token_short_code: (source.short_code ?? token.short_code) as string | undefined,
    token_expire: (source.token_expire ?? token.expire) as string | null | undefined,
    token_used: toBoolean(source.token_used ?? token.used),
    token_used_at: (source.token_used_at ?? token.used_at) as string | null | undefined,
  }
}

const buildQuery = (params: OnboardingListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))

  if (params.status?.trim()) search.set('status', params.status.trim())
  if (params.payment_mode?.trim()) search.set('payment_mode', params.payment_mode.trim())
  if (params.orderField) search.set('orderField', params.orderField)
  if (params.orderDirection) search.set('orderDirection', params.orderDirection)

  const query = search.toString()
  return query ? `?${query}` : ''
}

const resolveMutation = (payload: MutationResponse | OnboardingDetail) => {
  const source = (payload as MutationResponse).data ?? (payload as MutationResponse).onboarding ?? payload
  const normalized = normalizeOnboardingItem(source)
  const token = toRecord((payload as MutationResponse).token)

  if (token.short_code && !normalized.token_short_code) {
    normalized.token_short_code = token.short_code as string
  }

  if (token.expire && !normalized.token_expire) {
    normalized.token_expire = token.expire as string
  }

  if (token.used !== undefined) {
    normalized.token_used = toBoolean(token.used)
  }

  if (token.used_at && !normalized.token_used_at) {
    normalized.token_used_at = token.used_at as string
  }

  return normalized
}

const normalizeTemplate = (value: unknown): PublicOnboardingTemplate | null => {
  const source = toRecord(value)
  const id = (source.id ?? source.template_id ?? source.value) as number | string | undefined
  const name = (source.name ?? source.title ?? source.label ?? '').toString().trim()
  const description = (source.description ?? source.summary ?? source.details ?? '') as string

  if (!id && !name) return null

  const fallbackName = id ? `Template ${id}` : 'Template disponible'
  return {
    id,
    name: name || fallbackName,
    description: description?.trim() || undefined,
  }
}

const extractTemplateList = (source: Record<string, unknown>) => {
  const candidates: unknown[] = []
  const directKeys = ['templates', 'template_options', 'available_templates', 'options']

  for (const key of directKeys) {
    if (Array.isArray(source[key])) {
      candidates.push(...(source[key] as unknown[]))
    }
  }

  const plan = toRecord(source.plan)
  if (Array.isArray(plan.templates)) {
    candidates.push(...(plan.templates as unknown[]))
  }

  const nestedData = toRecord(source.data)
  for (const key of directKeys) {
    if (Array.isArray(nestedData[key])) {
      candidates.push(...(nestedData[key] as unknown[]))
    }
  }

  const byId = new Set<string>()
  const normalized: PublicOnboardingTemplate[] = []

  for (const item of candidates) {
    const template = normalizeTemplate(item)
    if (!template) continue
    const uniqKey = String(template.id ?? template.name)
    if (byId.has(uniqKey)) continue
    byId.add(uniqKey)
    normalized.push(template)
  }

  return normalized
}

const normalizePublicContext = (code: string, payload: PublicGetResponse) => {
  const source = toRecord(payload.data ?? payload.onboarding ?? payload)
  const normalized = normalizeOnboardingItem(source) as PublicOnboardingContext
  normalized.code = code
  normalized.templates = extractTemplateList(source)

  if (
    (normalized.template_id === undefined || normalized.template_id === null || normalized.template_id === '') &&
    normalized.templates.length
  ) {
    normalized.template_id = normalized.templates[0]?.id ?? normalized.template_id
  }

  return normalized
}

export const listOnboardings = async (params: OnboardingListParams) => {
  const payload = await request<ListResponse>(`${MASTER_ONBOARDINGS_ENDPOINT}${buildQuery(params)}`)
  const dataSource = payload.data ?? payload
  const rawList = extractList(dataSource)
  const list = rawList.map(normalizeOnboardingItem)

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

export const getOnboarding = async (id: string | number) => {
  const payload = await request<GetResponse>(`${MASTER_ONBOARDINGS_ENDPOINT}/${id}`)
  const source = payload.data ?? payload.onboarding ?? payload
  return normalizeOnboardingItem(source)
}

export type CreateOnboardingInput = {
  plan_id: string | number
  payment_mode?: 'paid' | 'gift'
  expires_in_days?: number | null
}

export type UpdateOnboardingInput = {
  plan_id?: string | number
  payment_mode?: 'paid' | 'gift'
}

export type ResendOnboardingInput = {
  expires_in_days?: number | null
}

export const createOnboarding = async (body: CreateOnboardingInput) => {
  const payload = await request<MutationResponse>(MASTER_ONBOARDINGS_ENDPOINT, {
    method: 'POST',
    body,
  })
  return resolveMutation(payload)
}

export const updateOnboarding = async (id: string | number, body: UpdateOnboardingInput) => {
  const payload = await request<MutationResponse>(`${MASTER_ONBOARDINGS_ENDPOINT}/${id}`, {
    method: 'PUT',
    body,
  })
  return resolveMutation(payload)
}

export const cancelOnboarding = async (id: string | number) => {
  const payload = await request<MutationResponse>(`${MASTER_ONBOARDINGS_ENDPOINT}/${id}/cancel`, {
    method: 'POST',
    body: {},
  })
  return resolveMutation(payload)
}

export const resendOnboarding = async (id: string | number, body: ResendOnboardingInput) => {
  const payload = await request<MutationResponse>(`${MASTER_ONBOARDINGS_ENDPOINT}/${id}/resend`, {
    method: 'POST',
    body,
  })
  return resolveMutation(payload)
}

export const getPublicOnboarding = async (code: string) => {
  const payload = await request<PublicGetResponse>(`${PUBLIC_ONBOARDINGS_ENDPOINT}/${code}`)
  return normalizePublicContext(code, payload)
}

export const completePublicOnboarding = async (code: string, body: CompletePublicOnboardingInput) => {
  const payload = await request<PublicCompleteResponse>(`${PUBLIC_ONBOARDINGS_ENDPOINT}/${code}/complete`, {
    method: 'POST',
    body,
  })
  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Tu cuenta se completo correctamente.',
    next_step: data.next_step as string | undefined,
    onboarding: Object.keys(toRecord(data.onboarding)).length
      ? normalizeOnboardingItem(data.onboarding)
      : null,
    registration: Object.keys(toRecord(data.registration)).length
      ? {
          full_name: toRecord(data.registration).full_name as string | undefined,
          email: toRecord(data.registration).email as string | undefined,
          country_code: toRecord(data.registration).country_code as string | undefined,
          register_method: toRecord(data.registration).register_method as string | undefined,
        }
      : null,
    client: Object.keys(toRecord(data.client)).length
      ? {
          id: toRecord(data.client).id as number | string | undefined,
          client_name: toRecord(data.client).client_name as string | undefined,
          country_code: toRecord(data.client).country_code as string | null | undefined,
          status: toRecord(data.client).status as string | null | undefined,
        }
      : null,
    user: Object.keys(toRecord(data.user)).length
      ? {
          id: toRecord(data.user).id as number | string | undefined,
          name: toRecord(data.user).name as string | undefined,
          last_name: toRecord(data.user).last_name as string | undefined,
          email: toRecord(data.user).email as string | undefined,
          is_master: toBoolean(toRecord(data.user).is_master),
        }
      : null,
  } satisfies CompletePublicOnboardingResult
}
