import { request } from '@/services/http'

export type TenantInvitationStatus = 'draft' | 'published' | ''

export type TenantInvitationItem = {
  id?: number
  template_id?: number
  type_event_id?: number
  title?: string
  slug?: string
  status?: string
  content?: Record<string, unknown> | null
  text_overrides?: Record<string, string> | null
  settings?: Record<string, unknown> | null
  feature_overrides?: Record<string, unknown> | null
  published_snapshot?: Record<string, unknown> | null
  consumed_credit_ids?: number[] | null
  credit_movement_ids?: number[] | null
  published_at?: string | null
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

export type TenantInvitationListParams = {
  page?: number
  perPage?: number
  status?: TenantInvitationStatus
  search?: string
}

export type TenantTemplateSummary = {
  id?: number
  name?: string
  slug?: string
  renderer_key?: string
  preview_image?: string | null
  definition_version?: string | null
  definition?: Record<string, unknown> | null
  type_event_id?: number | null
  plan_id?: number | null
}

export type TenantTypeEventSummary = {
  id?: number
  name?: string
}

export type TenantInvitationDetail = {
  invitation: TenantInvitationItem | null
  template: TenantTemplateSummary | null
  type_event: TenantTypeEventSummary | null
}

export type TenantInvitationGalleryImage = {
  id: number
  original_name: string
  stored_name: string
  extension: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  sort_order: number
  storage_disk: string
  storage_path: string
  public_url: string
  variants: Record<string, unknown> | null
  variant_urls: Record<string, string> | null
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
  processing_error: string | null
  is_ready: boolean
  variants_generated_at: string | null
  uploaded_at: string | null
  created_at: string | null
}

export type TenantInvitationGallerySummary = {
  enabled: boolean
  limit: number | null
  used: number
  remaining: number | null
}

export type TenantInvitationGalleryDetail = {
  gallery: TenantInvitationGallerySummary
  items: TenantInvitationGalleryImage[]
}

export type TenantDashboardSummary = {
  total_invitations: number
  draft_invitations: number
  published_invitations: number
  credits_available: number
  last_updated_at: string | null
}

export type UpsertTenantInvitationPayload = {
  template_id?: number | string
  type_event_id?: number | string | null
  title?: string | null
  slug?: string | null
  content?: Record<string, unknown> | null
  text_overrides?: Record<string, string> | null
  settings?: Record<string, unknown> | null
  feature_overrides?: Record<string, unknown> | null
  reset_content?: boolean
}

export type TenantSubdomainAvailability = {
  subdomain: string
  format_valid: boolean
  available: boolean
  reason: string
}

type TenantDashboardResponse = {
  data?: Partial<TenantDashboardSummary>
}

type TenantApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const TENANT_BASE = '/tenant'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeTextOverrides = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const source = value as Record<string, unknown>
  const map: Record<string, string> = {}

  for (const [key, raw] of Object.entries(source)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) continue
    map[normalizedKey] = typeof raw === 'string' ? raw : String(raw ?? '')
  }

  return Object.keys(map).length ? map : null
}

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  const source = toRecord(value)

  const keys = ['items', 'data', 'rows', 'list']
  for (const key of keys) {
    if (Array.isArray(source[key])) {
      return source[key] as unknown[]
    }
  }

  return []
}

const parsePagination = (value: unknown, fallbackPage = 1, fallbackPerPage = 10) => {
  const source = toRecord(value)
  const pagination = toRecord(source.pagination)

  return {
    page: toNumber(
      pagination.current_page ?? source.current_page ?? source.page,
      fallbackPage,
    ),
    lastPage: toNumber(
      pagination.last_page ?? source.last_page ?? source.page,
      fallbackPage,
    ),
    perPage: toNumber(
      pagination.per_page ?? source.per_page,
      fallbackPerPage,
    ),
    total: toNumber(pagination.total ?? source.total, 0),
  }
}

const buildQuery = (params: TenantInvitationListParams) => {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('perPage', String(params.perPage ?? 10))
  if (params.status && params.status.trim()) search.set('status', params.status.trim())
  if (params.search && params.search.trim()) search.set('search', params.search.trim())
  const query = search.toString()
  return query ? `?${query}` : ''
}

const normalizeInvitation = (value: unknown): TenantInvitationItem => {
  const source = toRecord(value)
  return {
    id: toNumber(source.id, 0) || undefined,
    template_id: toNumber(source.template_id, 0) || undefined,
    type_event_id: toNumber(source.type_event_id, 0) || undefined,
    title: source.title as string | undefined,
    slug: source.slug as string | undefined,
    status: source.status as string | undefined,
    content: (source.content ?? null) as Record<string, unknown> | null,
    text_overrides: normalizeTextOverrides(source.text_overrides),
    settings: (source.settings ?? null) as Record<string, unknown> | null,
    feature_overrides: (source.feature_overrides ?? null) as Record<string, unknown> | null,
    published_snapshot: (source.published_snapshot ?? null) as Record<string, unknown> | null,
    consumed_credit_ids: (source.consumed_credit_ids ?? null) as number[] | null,
    credit_movement_ids: (source.credit_movement_ids ?? null) as number[] | null,
    published_at: (source.published_at ?? null) as string | null,
    expires_at: (source.expires_at ?? null) as string | null,
    created_at: source.created_at as string | undefined,
    updated_at: source.updated_at as string | undefined,
  }
}

const normalizeGalleryItem = (value: unknown): TenantInvitationGalleryImage => {
  const source = toRecord(value)
  const variantUrlsSource = toRecord(source.variant_urls)
  const variantUrls = Object.keys(variantUrlsSource).reduce<Record<string, string>>((carry, key) => {
    const rawValue = variantUrlsSource[key]
    if (typeof rawValue !== 'string') return carry
    const normalizedKey = key.trim()
    if (!normalizedKey) return carry
    carry[normalizedKey] = rawValue
    return carry
  }, {})

  const processingStatus = String(source.processing_status ?? 'pending').trim().toLowerCase()
  const normalizedProcessingStatus = ['pending', 'processing', 'ready', 'failed'].includes(processingStatus)
    ? (processingStatus as TenantInvitationGalleryImage['processing_status'])
    : 'pending'

  return {
    id: toNumber(source.id, 0),
    original_name: String(source.original_name ?? ''),
    stored_name: String(source.stored_name ?? ''),
    extension: String(source.extension ?? ''),
    mime_type: String(source.mime_type ?? ''),
    size_bytes: toNumber(source.size_bytes, 0),
    width: source.width === null || source.width === undefined ? null : toNumber(source.width, 0),
    height: source.height === null || source.height === undefined ? null : toNumber(source.height, 0),
    sort_order: toNumber(source.sort_order, 0),
    storage_disk: String(source.storage_disk ?? ''),
    storage_path: String(source.storage_path ?? ''),
    public_url: String(source.public_url ?? ''),
    variants: Object.keys(toRecord(source.variants)).length ? toRecord(source.variants) : null,
    variant_urls: Object.keys(variantUrls).length ? variantUrls : null,
    processing_status: normalizedProcessingStatus,
    processing_error: source.processing_error ? String(source.processing_error) : null,
    is_ready: Boolean(source.is_ready) || normalizedProcessingStatus === 'ready',
    variants_generated_at: source.variants_generated_at ? String(source.variants_generated_at) : null,
    uploaded_at: source.uploaded_at ? String(source.uploaded_at) : null,
    created_at: source.created_at ? String(source.created_at) : null,
  }
}

const normalizeGallerySummary = (value: unknown): TenantInvitationGallerySummary => {
  const source = toRecord(value)
  return {
    enabled: Boolean(source.enabled),
    limit: source.limit === null || source.limit === undefined ? null : toNumber(source.limit, 0),
    used: toNumber(source.used, 0),
    remaining: source.remaining === null || source.remaining === undefined ? null : toNumber(source.remaining, 0),
  }
}

export const getTenantDashboardSummary = async (): Promise<TenantDashboardSummary> => {
  const payload = await request<TenantDashboardResponse>(`${TENANT_BASE}/dashboard`)
  const data = toRecord(payload.data)

  return {
    total_invitations: toNumber(data.total_invitations, 0),
    draft_invitations: toNumber(data.draft_invitations, 0),
    published_invitations: toNumber(data.published_invitations, 0),
    credits_available: toNumber(data.credits_available, 0),
    last_updated_at: (data.last_updated_at ?? null) as string | null,
  }
}

const normalizeTemplateSummary = (value: unknown): TenantTemplateSummary | null => {
  const source = toRecord(value)
  if (!Object.keys(source).length) return null

  return {
    id: toNumber(source.id, 0) || undefined,
    name: source.name as string | undefined,
    slug: source.slug as string | undefined,
    renderer_key: source.renderer_key as string | undefined,
    preview_image: (source.preview_image ?? null) as string | null,
    definition_version: (source.definition_version ?? null) as string | null,
    definition: Object.keys(toRecord(source.definition)).length ? toRecord(source.definition) : null,
    type_event_id: toNumber(source.type_event_id, 0) || null,
    plan_id: toNumber(source.plan_id, 0) || null,
  }
}

const normalizeTypeEventSummary = (value: unknown): TenantTypeEventSummary | null => {
  const source = toRecord(value)
  if (!Object.keys(source).length) return null

  return {
    id: toNumber(source.id, 0) || undefined,
    name: source.name as string | undefined,
  }
}

export const listTenantInvitations = async (params: TenantInvitationListParams) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations${buildQuery(params)}`)
  const pagePayload = toRecord(payload.data)
  const rows = extractList(pagePayload)
  const list = rows.map(normalizeInvitation)
  const pagination = parsePagination(pagePayload, params.page ?? 1, params.perPage ?? 10)

  return {
    list,
    ...pagination,
  }
}

export const getTenantInvitation = async (invitationId: string | number): Promise<TenantInvitationDetail> => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/${invitationId}`)
  const data = toRecord(payload.data)

  return {
    invitation: normalizeInvitation(data.invitation),
    template: normalizeTemplateSummary(data.template),
    type_event: normalizeTypeEventSummary(data.type_event),
  }
}

export const getTenantInvitationGallery = async (invitationId: string | number): Promise<TenantInvitationGalleryDetail> => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/${invitationId}/gallery`)
  const data = toRecord(payload.data)

  return {
    gallery: normalizeGallerySummary(data.gallery),
    items: extractList(data.items).map(normalizeGalleryItem),
  }
}

export const createTenantInvitation = async (body: UpsertTenantInvitationPayload) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations`, {
    method: 'POST',
    body,
  })

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Invitacion creada.',
    invitation: normalizeInvitation(toRecord(data.invitation)),
  }
}

export const updateTenantInvitation = async (invitationId: string | number, body: UpsertTenantInvitationPayload) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/${invitationId}`, {
    method: 'PUT',
    body,
  })

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Cambios guardados.',
    invitation: normalizeInvitation(toRecord(data.invitation)),
  }
}

export const publishTenantInvitation = async (invitationId: string | number) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/${invitationId}/publish`, {
    method: 'POST',
    body: {},
  })

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Invitacion publicada.',
    invitation: normalizeInvitation(toRecord(data.invitation)),
    ttl: toRecord(data.ttl),
  }
}

export const deleteTenantInvitation = async (invitationId: string | number) => {
  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/${invitationId}`, {
    method: 'DELETE',
  })

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Borrador eliminado.',
    invitation_id: toNumber(data.invitation_id, 0) || undefined,
    deleted: Boolean(data.deleted),
  }
}

export const syncTenantInvitationGalleryImages = async (
  invitationId: string | number,
  options: {
    files?: File[]
    removeImageIds?: Array<number | string>
    method?: 'POST' | 'PUT'
  },
) => {
  const files = Array.isArray(options.files) ? options.files : []
  const removeImageIds = Array.isArray(options.removeImageIds)
    ? options.removeImageIds
        .map((value) => Number(value))
        .filter((value, index, collection) => Number.isFinite(value) && value > 0 && collection.indexOf(value) === index)
    : []
  const method = options.method ?? 'PUT'

  const body = new FormData()
  files.forEach((file) => body.append('images[]', file))
  removeImageIds.forEach((id) => body.append('remove_image_ids[]', String(id)))

  const payload = await request<TenantApiResponse<Record<string, unknown>>>(
    `${TENANT_BASE}/invitations/${invitationId}/gallery`,
    {
      method,
      body,
    },
  )

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Galería actualizada.',
    gallery: normalizeGallerySummary(data.gallery),
    items: extractList(data.items).map(normalizeGalleryItem),
  }
}

export const uploadTenantInvitationGalleryImages = async (
  invitationId: string | number,
  files: File[],
) =>
  syncTenantInvitationGalleryImages(invitationId, {
    files,
    removeImageIds: [],
    method: 'POST',
  })

export const checkTenantInvitationSubdomainAvailability = async (params: {
  slug: string
  invitation_id?: number | string
}): Promise<TenantSubdomainAvailability> => {
  const search = new URLSearchParams()
  search.set('slug', params.slug)
  if (params.invitation_id !== undefined && params.invitation_id !== null) {
    search.set('invitation_id', String(params.invitation_id))
  }

  const payload = await request<TenantApiResponse<Record<string, unknown>>>(`${TENANT_BASE}/invitations/subdomain-availability?${search.toString()}`)
  const data = toRecord(payload.data)

  return {
    subdomain: String(data.subdomain ?? ''),
    format_valid: Boolean(data.format_valid),
    available: Boolean(data.available),
    reason: String(data.reason ?? ''),
  }
}
