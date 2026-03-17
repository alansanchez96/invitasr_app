import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/services/http'

type AuthUser = {
  name: string
  last_name: string
  email: string
  created_at: string
  updated_at: string
  contextEncrypt: boolean
}

type LoginResponse = {
  status: boolean
  message?: string
  session?: {
    token: string
    expire: number
  }
  user?: AuthUser
  errors?: Record<string, string[]>
}

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(localStorage.getItem('token') || sessionStorage.getItem('token'))
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
  const user = ref<AuthUser | null>(storedUser ? (JSON.parse(storedUser) as AuthUser) : null)
  const isLoading = ref(false)
  const isLoggingOut = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isMaster = computed(() => Boolean(user.value?.contextEncrypt))

  const setSession = (newToken: string, userData?: AuthUser, remember = false) => {
    token.value = newToken
    user.value = userData ?? null

    const targetStorage = remember ? localStorage : sessionStorage
    const otherStorage = remember ? sessionStorage : localStorage
    targetStorage.setItem('token', newToken)
    if (userData) {
      targetStorage.setItem('user', JSON.stringify(userData))
    }
    otherStorage.removeItem('token')
    otherStorage.removeItem('user')
  }

  const clearSession = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  const login = async (email: string, password: string, remember = false) => {
    isLoading.value = true
    try {
      const payload = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (payload.status && payload.session?.token && payload.user) {
        setSession(payload.session.token, payload.user, remember)
        return { ok: true }
      }

      return {
        ok: false,
        message: payload.message ?? 'No pudimos iniciar sesion.',
        fieldErrors: payload.errors ?? {},
      }
    } catch (error) {
      const parsed = error as LoginResponse
      return {
        ok: false,
        message: parsed?.message ?? 'No pudimos iniciar sesion.',
        fieldErrors: parsed?.errors ?? {},
      }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoggingOut.value = true
    const currentToken = token.value
    clearSession()
    try {
      if (currentToken) {
        await request('/auth/logout', {
          method: 'POST',
          token: currentToken,
        })
      }
    } catch {
      // No bloqueamos el logout del frontend si el backend falla.
    } finally {
      isLoggingOut.value = false
    }
  }

  return {
    token,
    user,
    isLoading,
    isLoggingOut,
    isAuthenticated,
    isMaster,
    setSession,
    clearSession,
    login,
    logout,
  }
})
