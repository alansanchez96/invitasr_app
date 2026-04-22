import { request } from '@/services/http'
import type { WeddingTemplateData } from '@/templates/types'

type PublicApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
  status?: number
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
  }
}

export const getPublicInvitationByHost = async (): Promise<PublicInvitationPayload> => {
  const response = await request<PublicApiResponse<Record<string, unknown>>>('/invitations/resolve-by-host', {
    token: '',
    credentials: 'omit',
  })

  return normalizePayload(response?.data ?? {})
}
