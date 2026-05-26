import { request } from '@/services/http'

type ApiResponse<T> = {
  data?: T
}

export type WhatsappTenant = {
  id: number
  client_name: string
  db_name: string
  status: string
  country_code: string | null
  is_queryable: boolean
  whatsapp_counts: WhatsappSummary
}

export type WhatsappSummary = {
  table_available: boolean
  total: number
  pending: number
  accepted: number
  received: number
  delivered: number
  read: number
  failed: number
  skipped: number
}

export type WhatsappChat = {
  participant_phone: string
  participant_name: string | null
  invitation_id: number | null
  invitation_title: string | null
  last_message_id: number
  last_message_direction: string
  last_message_type: string
  last_content_type: string
  last_status: string
  last_text: string
  last_message_at: string | null
}

export type WhatsappMessage = {
  id: number
  invitation_id: number | null
  invitation_title: string | null
  rsvp_response_id: number | null
  provider: string
  provider_message_id: string | null
  recipient_phone: string | null
  participant_phone: string | null
  participant_name: string | null
  direction: string
  message_type: string
  content_type: string
  template_name: string | null
  template_language: string | null
  body_text: string | null
  delivery_status: string
  failure_reason: string | null
  error_code: string | null
  error_message: string | null
  response_status_code: number | null
  attempted_at: string | null
  accepted_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  created_at: string | null
  request_method?: string | null
  request_url?: string | null
  request_headers?: unknown
  request_payload?: unknown
  response_body?: unknown
}

export type WhatsappPagination = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const BASE = '/master/whatsapp'

const query = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const listWhatsappTenants = async () => {
  const payload = await request<ApiResponse<{ items?: WhatsappTenant[] }>>(`${BASE}/tenants`)
  return payload.data?.items ?? []
}

export const listWhatsappChats = async (tenantId: number | string) => {
  const payload = await request<ApiResponse<{ items?: WhatsappChat[] }>>(
    `${BASE}/chats${query({ tenant_id: tenantId })}`,
  )
  return payload.data?.items ?? []
}

export const listWhatsappMessages = async (tenantId: number | string, phone: string) => {
  const payload = await request<ApiResponse<{ items?: WhatsappMessage[] }>>(
    `${BASE}/messages${query({ tenant_id: tenantId, phone })}`,
  )
  return payload.data?.items ?? []
}

export const listWhatsappLogs = async (params: {
  tenant_id: number | string
  status?: string
  direction?: string
  phone?: string
  page?: number
  perPage?: number
}) => {
  const payload = await request<ApiResponse<{
    items?: WhatsappMessage[]
    pagination?: WhatsappPagination
    summary?: WhatsappSummary
  }>>(`${BASE}/logs${query(params)}`)

  return {
    items: payload.data?.items ?? [],
    pagination: payload.data?.pagination ?? {
      current_page: params.page ?? 1,
      last_page: 1,
      per_page: params.perPage ?? 25,
      total: 0,
    },
    summary: payload.data?.summary ?? {
      table_available: false,
      total: 0,
      pending: 0,
      accepted: 0,
      received: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      skipped: 0,
    },
  }
}
