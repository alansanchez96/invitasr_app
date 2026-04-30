import { request } from '@/services/http'

export type TenantNotificationKey =
  | 'wall_message_received'
  | 'product_updates'
  | 'billing_updates'
  | 'rsvp_confirmed'
  | 'invitation_expiration_reminder'
  | 'weekly_performance_summary'

export type TenantNotificationPreferences = Record<TenantNotificationKey, boolean>

type ApiResponse<T = Record<string, unknown>> = {
  data?: T
  message?: string
}

const ENDPOINT = '/tenant/notifications/preferences'

const DEFAULTS: TenantNotificationPreferences = {
  wall_message_received: true,
  product_updates: true,
  billing_updates: true,
  rsvp_confirmed: true,
  invitation_expiration_reminder: true,
  weekly_performance_summary: false,
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const normalize = (value: unknown): TenantNotificationPreferences => {
  const source = toRecord(value)
  const preferences = toRecord(source.preferences ?? source)

  return {
    wall_message_received: Boolean(preferences.wall_message_received ?? DEFAULTS.wall_message_received),
    product_updates: Boolean(preferences.product_updates ?? DEFAULTS.product_updates),
    billing_updates: Boolean(preferences.billing_updates ?? DEFAULTS.billing_updates),
    rsvp_confirmed: Boolean(preferences.rsvp_confirmed ?? DEFAULTS.rsvp_confirmed),
    invitation_expiration_reminder: Boolean(
      preferences.invitation_expiration_reminder ?? DEFAULTS.invitation_expiration_reminder,
    ),
    weekly_performance_summary: Boolean(
      preferences.weekly_performance_summary ?? DEFAULTS.weekly_performance_summary,
    ),
  }
}

export const getTenantNotificationPreferences = async (): Promise<TenantNotificationPreferences> => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(ENDPOINT)

  return normalize(payload.data)
}

export const updateTenantNotificationPreferences = async (
  preferences: TenantNotificationPreferences,
): Promise<{ message: string; preferences: TenantNotificationPreferences }> => {
  const payload = await request<ApiResponse<Record<string, unknown>>>(ENDPOINT, {
    method: 'PUT',
    body: preferences,
  })

  return {
    message: payload.message ?? 'Tus preferencias de notificación quedaron guardadas.',
    preferences: normalize(payload.data),
  }
}
