import { request } from '@/services/http'

type AuthMessageResponse = {
  message?: string
  data?: unknown
  status?: number | boolean
}

export type ForgotPasswordInput = {
  email: string
}

export type ResetPasswordInput = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export const requestPasswordReset = async (input: ForgotPasswordInput) => {
  const payload = await request<AuthMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: input,
  })

  return {
    message: payload.message ?? 'Te enviamos un enlace para recuperar tu cuenta.',
  }
}

export const resetPassword = async (input: ResetPasswordInput) => {
  const payload = await request<AuthMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: input,
  })

  return {
    message: payload.message ?? 'Tu contrasena fue actualizada. Ya puedes iniciar sesion.',
  }
}
