import type { PublicOnboardingProfile } from '@/services/publicOnboarding'
import { formatBillingLabel, formatPlanName } from '@/utils/publicPlanMarketing'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  paid: 'Pago aprobado',
  trialing: 'En prueba',
  past_due: 'Pendiente de pago',
  pending: 'Pendiente',
  draft: 'Borrador',
  published: 'Publicada',
  review: 'En revision',
  complete: 'Completado',
  completed: 'Completado',
}

type SessionLikeUser = {
  tenant?: {
    id?: number | string
    status?: string | null
  } | null
  client_plan?: {
    has_plan?: boolean
    has_active_plan?: boolean
    plan_status?: string | null
    plan?: {
      id?: number | string
      name?: string | null
      billing_type?: string | null
    } | null
  } | null
} | null

export const formatStatusLabel = (value?: string | null, fallback = 'Sin definir') => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (!normalized) return fallback
  return STATUS_LABELS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export const getClientPlanName = (user?: SessionLikeUser) => {
  const name = user?.client_plan?.plan?.name
  return name ? formatPlanName(name) : 'Sin plan'
}

export const getClientBillingLabel = (user?: SessionLikeUser) => {
  return formatBillingLabel(user?.client_plan?.plan?.billing_type ?? '')
}

export const getClientPlanStatusLabel = (user?: SessionLikeUser) => {
  return formatStatusLabel(user?.client_plan?.plan_status, 'Sin estado')
}

export const getTenantStatusLabel = (user?: SessionLikeUser) => {
  return formatStatusLabel(user?.tenant?.status, 'Sin tenant')
}

export const getSelectedTemplateName = (profile?: PublicOnboardingProfile | null) => {
  return profile?.onboarding?.template?.name ?? 'Sin template asociada'
}

export const getOnboardingStatusLabel = (profile?: PublicOnboardingProfile | null) => {
  return formatStatusLabel(profile?.onboarding?.status, 'Sin onboarding')
}

export const getNextStepLabel = (profile?: PublicOnboardingProfile | null) => {
  return formatStatusLabel(profile?.next_step, 'Sin siguiente paso')
}

export const getRegistrationName = (profile?: PublicOnboardingProfile | null) => {
  return profile?.registration?.full_name?.trim() || 'Tu cuenta'
}
