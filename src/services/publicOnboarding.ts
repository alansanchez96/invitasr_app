import { request } from '@/services/http'

export type PublicRegisterMethod = 'email' | 'google' | 'facebook'

export type PublicOnboardingRegistrationInput = {
  plan_id: number | string
  template_id: number | string | null
  register_method: PublicRegisterMethod
  full_name: string
  email: string
  password: string
  country_code: string
}

export type PublicOnboardingProfileUpdateInput = {
  plan_id: number | string
  template_id: number | string | null
  full_name: string
  email: string
  country_code: string
  register_method?: PublicRegisterMethod
  password?: string
}

export type PublicOnboardingRegistration = {
  full_name?: string
  email?: string
  country_code?: string
  register_method?: string
}

export type PublicOnboardingPlan = {
  id?: number | string
  name?: string
  billing_type?: string
  price_usd?: number | string | null
}

export type PublicOnboardingTemplate = {
  id?: number | string
  name?: string
  plan_id?: number | string | null
}

export type PublicOnboardingRecord = {
  id?: number | string
  plan_id?: number | string
  template_id?: number | string | null
  status?: string
  payment_mode?: string
  plan?: PublicOnboardingPlan | null
  template?: PublicOnboardingTemplate | null
}

export type PublicOnboardingProfile = {
  onboarding: PublicOnboardingRecord | null
  registration: PublicOnboardingRegistration | null
  next_step?: string
}

export type PublicAuthSession = {
  token?: string
  expire?: number
}

export type PublicAuthUser = {
  id?: number | string
  name: string
  last_name: string
  email: string
  created_at: string
  updated_at: string
  contextEncrypt: boolean
  tenant?: {
    id?: number | string
    status?: string | null
    country_code?: string | null
  } | null
  client_plan?: {
    has_plan?: boolean
    has_active_plan?: boolean
    plan_status?: string
    source?: string
    plan?: {
      id?: number | string
      name?: string
      billing_type?: string
    } | null
  } | null
}

type PublicPayloadResponse = {
  message?: string
  status?: number | boolean
  data?: Record<string, unknown>
}

export type PublicRegisterResult = {
  message: string
  profile: PublicOnboardingProfile
  session?: PublicAuthSession
  user?: PublicAuthUser
}

export type PublicCheckoutResult = {
  message: string
  checkout_url?: string
  provider?: string
  payment_id?: number | string
  plan_id?: number | string
  onboarding_id?: number | string
}

const PUBLIC_ONBOARDING_BASE = '/onboarding/public'

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const normalizeProfile = (source: Record<string, unknown>): PublicOnboardingProfile => {
  const onboardingRaw = toRecord(source.onboarding)
  const registrationRaw = toRecord(source.registration)
  const clientRaw = toRecord(source.client)

  return {
    onboarding: Object.keys(onboardingRaw).length
      ? {
          id: (onboardingRaw.id ?? onboardingRaw.onboarding_id) as number | string | undefined,
          plan_id: (onboardingRaw.plan_id ?? onboardingRaw.planId) as number | string | undefined,
          template_id: (onboardingRaw.template_id ?? onboardingRaw.templateId) as
            | number
            | string
            | null
            | undefined,
          status: onboardingRaw.status as string | undefined,
          payment_mode: onboardingRaw.payment_mode as string | undefined,
          plan: toRecord(onboardingRaw.plan) as PublicOnboardingPlan,
          template: toRecord(onboardingRaw.template) as PublicOnboardingTemplate,
        }
      : null,
    registration: Object.keys(registrationRaw).length
      ? {
          full_name: registrationRaw.full_name as string | undefined,
          email: registrationRaw.email as string | undefined,
          country_code: (registrationRaw.country_code ?? clientRaw.country_code) as string | undefined,
          register_method: registrationRaw.register_method as string | undefined,
        }
      : null,
    next_step: source.next_step as string | undefined,
  }
}

const parseProfilePayload = (payload: PublicPayloadResponse): PublicOnboardingProfile => {
  const data = toRecord(payload.data)
  return normalizeProfile(data)
}

export const registerPublicOnboarding = async (body: PublicOnboardingRegistrationInput): Promise<PublicRegisterResult> => {
  const payload = await request<PublicPayloadResponse>(`${PUBLIC_ONBOARDING_BASE}/register`, {
    method: 'POST',
    body,
  })

  const data = toRecord(payload.data)

  return {
    message: payload.message ?? 'Tu cuenta ya esta lista para continuar.',
    profile: parseProfilePayload(payload),
    session: Object.keys(toRecord(data.session)).length ? (toRecord(data.session) as PublicAuthSession) : undefined,
    user: Object.keys(toRecord(data.user)).length ? (toRecord(data.user) as PublicAuthUser) : undefined,
  }
}

export const getPublicOnboardingProfile = async (): Promise<PublicRegisterResult> => {
  const payload = await request<PublicPayloadResponse>(`${PUBLIC_ONBOARDING_BASE}/profile`)
  return {
    message: payload.message ?? 'Resumen de tu proceso actual.',
    profile: parseProfilePayload(payload),
  }
}

export const updatePublicOnboardingProfile = async (
  body: PublicOnboardingProfileUpdateInput,
): Promise<PublicRegisterResult> => {
  const payload = await request<PublicPayloadResponse>(`${PUBLIC_ONBOARDING_BASE}/profile`, {
    method: 'PUT',
    body,
  })

  return {
    message: payload.message ?? 'Tus datos se actualizaron correctamente.',
    profile: parseProfilePayload(payload),
  }
}

export const checkoutPublicOnboarding = async (
  body?: Partial<PublicOnboardingRegistrationInput>,
): Promise<PublicCheckoutResult> => {
  const payload = await request<PublicPayloadResponse>(`${PUBLIC_ONBOARDING_BASE}/checkout`, {
    method: 'POST',
    body: body ?? {},
  })

  const data = toRecord(payload.data)
  return {
    message: payload.message ?? 'Ya puedes continuar al pago.',
    checkout_url: (data.checkout_url ?? data.url) as string | undefined,
    provider: data.provider as string | undefined,
    payment_id: (data.payment_id ?? data.id) as number | string | undefined,
    plan_id: data.plan_id as number | string | undefined,
    onboarding_id: data.onboarding_id as number | string | undefined,
  }
}
