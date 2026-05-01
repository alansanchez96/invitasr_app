import { request } from '@/services/http'
import type { WeddingTemplateData } from '@/templates/types'

type PublicApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
  status?: number
}

type PublicWallMessageRaw = {
  id?: number | string
  guest_name?: string
  message?: string
  status?: string
  is_visible?: boolean
  posted_at?: string | null
  created_at?: string | null
}

type PublicInvitationRaw = {
  invitation?: Record<string, unknown> | null
  template?: Record<string, unknown> | null
  type_event?: Record<string, unknown> | null
  content?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  feature_overrides?: Record<string, unknown> | null
  text_overrides?: Record<string, string> | null
  subdomain?: Record<string, unknown> | null
  demo?: Record<string, unknown> | null
}

export type PublicInvitationPayload = {
  invitation: {
    id: number | null
    title: string
    slug: string
    status: string
    publishedAt: string | null
    expiresAt: string | null
  } | null
  template: {
    id: number | null
    name: string
    slug: string
    rendererKey: string
    definitionVersion: string
  } | null
  typeEvent: {
    id: number | null
    name: string
  } | null
  content: WeddingTemplateData | null
  settings: Record<string, unknown>
  featureOverrides: Record<string, unknown>
  textOverrides: Record<string, string>
  subdomain: {
    label: string
    host: string
    url: string
  } | null
  demo: {
    userPath: string
    slug: string
    expiresAt: string | null
    maxVisits: number | null
    visitCount: number
    remainingVisits: number | null
  } | null
}

export type PublicWallMessage = {
  id: string
  guestName: string
  message: string
  status: string
  isVisible: boolean
  postedAt: string | null
  createdAt: string | null
}

export type PublicRsvpResponse = {
  id: number
  firstName: string
  lastName: string
  fullName: string
  dietaryRestrictions: string | null
  status: string
  confirmedAt: string | null
  createdAt: string | null
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const toString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTextOverrides = (value: unknown): Record<string, string> => {
  const source = toRecord(value)
  const result: Record<string, string> = {}

  for (const [key, raw] of Object.entries(source)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) continue
    result[normalizedKey] = typeof raw === 'string' ? raw : String(raw ?? '')
  }

  return result
}

const normalizePayload = (value: unknown): PublicInvitationPayload => {
  const source = toRecord(value) as PublicInvitationRaw
  const rawSource = source as Record<string, unknown>
  const content = toRecord(source.content)
  const invitation = toRecord(source.invitation)
  const template = toRecord(source.template)
  const typeEvent = toRecord(source.type_event)
  const subdomain = toRecord(source.subdomain)

  return {
    invitation: Object.keys(invitation).length
      ? {
        id: toNumber(invitation.id),
        title: toString(invitation.title),
        slug: toString(invitation.slug),
        status: toString(invitation.status),
        publishedAt: toString(invitation.published_at || invitation.publishedAt) || null,
        expiresAt: toString(invitation.expires_at || invitation.expiresAt) || null,
      }
      : null,
    template: Object.keys(template).length
      ? {
        id: toNumber(template.id),
        name: toString(template.name),
        slug: toString(template.slug),
        rendererKey: toString(template.renderer_key || template.rendererKey),
        definitionVersion: toString(template.definition_version || template.definitionVersion),
      }
      : null,
    typeEvent: Object.keys(typeEvent).length
      ? {
        id: toNumber(typeEvent.id),
        name: toString(typeEvent.name),
      }
      : null,
    content: Object.keys(content).length ? (content as WeddingTemplateData) : null,
    settings: toRecord(source.settings),
    featureOverrides: toRecord(source.feature_overrides ?? rawSource.featureOverrides),
    textOverrides: normalizeTextOverrides(source.text_overrides ?? rawSource.textOverrides),
    subdomain: Object.keys(subdomain).length
      ? {
        label: toString(subdomain.label),
        host: toString(subdomain.host),
        url: toString(subdomain.url),
      }
      : null,
    demo: Object.keys(toRecord(source.demo)).length
      ? {
        userPath: toString(toRecord(source.demo).user_path || toRecord(source.demo).userPath),
        slug: toString(toRecord(source.demo).slug),
        expiresAt: toString(toRecord(source.demo).expires_at || toRecord(source.demo).expiresAt) || null,
        maxVisits: toNumber(toRecord(source.demo).max_visits || toRecord(source.demo).maxVisits),
        visitCount: Number(toRecord(source.demo).visit_count || toRecord(source.demo).visitCount || 0) || 0,
        remainingVisits: toNumber(toRecord(source.demo).remaining_visits || toRecord(source.demo).remainingVisits),
      }
      : null,
  }
}

export const getPublicInvitationByHost = async (): Promise<PublicInvitationPayload> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>('/invitations/resolve-by-host', {
    token: '',
    credentials: 'omit',
  })

  return normalizePayload(response?.data ?? {})
}

export const getPublicDemoInvitation = async (
  userPath: string,
  slug: string,
): Promise<PublicInvitationPayload> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>(
    `/demo-invitations/${encodeURIComponent(userPath)}/${encodeURIComponent(slug)}`,
    {
      token: '',
      credentials: 'omit',
    },
  )

  return normalizePayload(response?.data ?? {})
}

export const publishPublicDemoInvitation = async (formData: FormData): Promise<{
  publication: {
    userPath: string
    slug: string
    expiresAt: string | null
    maxVisits: number | null
  }
  url: string
}> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>('/demo-invitations/publish', {
    method: 'POST',
    token: '',
    credentials: 'omit',
    body: formData,
  })

  const data = toRecord(response.data)
  const publication = toRecord(data.publication)

  return {
    publication: {
      userPath: toString(publication.user_path || publication.userPath),
      slug: toString(publication.slug),
      expiresAt: toString(publication.expires_at || publication.expiresAt) || null,
      maxVisits: toNumber(publication.max_visits || publication.maxVisits),
    },
    url: toString(data.url),
  }
}

export const createPublicInvitationWallMessage = async (payload: {
  guest_name: string
  message: string
}): Promise<{
  message: PublicWallMessage
  summary: {
    limit: number | null
    used: number
    remaining: number | null
  }
}> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>('/invitations/wall-messages', {
    method: 'POST',
    token: '',
    credentials: 'omit',
    body: payload,
  })

  const data = toRecord(response.data)
  const rawMessage = toRecord(data.message) as PublicWallMessageRaw
  const rawSummary = toRecord(data.summary)

  return {
    message: {
      id: String(rawMessage.id ?? ''),
      guestName: toString(rawMessage.guest_name),
      message: toString(rawMessage.message),
      status: toString(rawMessage.status, 'visible'),
      isVisible: Boolean(rawMessage.is_visible ?? true),
      postedAt: toString(rawMessage.posted_at) || null,
      createdAt: toString(rawMessage.created_at) || null,
    },
    summary: {
      limit: toNumber(rawSummary.limit),
      used: Number(rawSummary.used ?? 0) || 0,
      remaining: toNumber(rawSummary.remaining),
    },
  }
}

export const createPublicInvitationRsvpResponse = async (payload: {
  first_name: string
  last_name: string
  dietary_restrictions?: string | null
}): Promise<{
  response: PublicRsvpResponse
  summary: {
    limit: number | null
    used: number
    remaining: number | null
  }
}> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>('/invitations/rsvp', {
    method: 'POST',
    token: '',
    credentials: 'omit',
    body: payload,
  })

  const data = toRecord(response.data)
  const rawRsvp = toRecord(data.response)
  const rawSummary = toRecord(data.summary)

  return {
    response: {
      id: Number(rawRsvp.id ?? 0) || 0,
      firstName: toString(rawRsvp.first_name),
      lastName: toString(rawRsvp.last_name),
      fullName: toString(rawRsvp.full_name),
      dietaryRestrictions: toString(rawRsvp.dietary_restrictions) || null,
      status: toString(rawRsvp.status, 'confirmed'),
      confirmedAt: toString(rawRsvp.confirmed_at) || null,
      createdAt: toString(rawRsvp.created_at) || null,
    },
    summary: {
      limit: toNumber(rawSummary.limit),
      used: Number(rawSummary.used ?? 0) || 0,
      remaining: toNumber(rawSummary.remaining),
    },
  }
}
