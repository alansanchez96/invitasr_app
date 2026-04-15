import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/services/http'

type AuthUser = {
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

type MeResponse = {
  status?: boolean
  user?: AuthUser
  data?: AuthUser
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const REMEMBER_KEY = 'session_remember'

const parseUser = (value: string | null): AuthUser | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as AuthUser
  } catch {
    return null
  }
}

const extractUser = (payload: MeResponse): AuthUser | null => {
  if (payload.user) return payload.user
  if (payload.data) return payload.data
  return null
}

export const useSessionStore = defineStore('session', () => {
  const authMode = (import.meta.env.VITE_AUTH_MODE as 'token' | 'cookie' | undefined) ?? 'token'
  const localUser = parseUser(localStorage.getItem(USER_KEY))
  const sessionUser = parseUser(sessionStorage.getItem(USER_KEY))
  const user = ref<AuthUser | null>(localUser ?? sessionUser)
  const token = ref<string | null>(
    authMode === 'token' ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) : null,
  )
  const isLoading = ref(false)
  const isLoggingOut = ref(false)
  const isHydrating = ref(false)
  const hasHydrated = ref(false)

  const isAuthenticated = computed(() =>
    authMode === 'cookie' ? Boolean(user.value) : Boolean(token.value),
  )
  const isMaster = computed(() => Boolean(user.value?.contextEncrypt))
  const isClient = computed(() => Boolean(user.value) && !isMaster.value)
  const hasClientPlan = computed(() => Boolean(user.value?.client_plan?.has_plan))
  const hasActiveClientPlan = computed(() => Boolean(user.value?.client_plan?.has_active_plan))
  const clientPlanStatus = computed(() => user.value?.client_plan?.plan_status ?? '')

  const persistSession = (newToken: string | null, userData?: AuthUser, remember = false) => {
    token.value = authMode === 'token' ? newToken : null
    user.value = userData ?? null

    const targetStorage = remember ? localStorage : sessionStorage
    const otherStorage = remember ? sessionStorage : localStorage

    if (authMode === 'token' && newToken) {
      targetStorage.setItem(TOKEN_KEY, newToken)
    } else {
      targetStorage.removeItem(TOKEN_KEY)
    }

    if (userData) {
      targetStorage.setItem(USER_KEY, JSON.stringify(userData))
    } else {
      targetStorage.removeItem(USER_KEY)
    }

    otherStorage.removeItem(TOKEN_KEY)
    otherStorage.removeItem(USER_KEY)

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, '1')
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
  }

  const clearSession = () => {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REMEMBER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  const patchUser = (patch: Partial<AuthUser>) => {
    if (!user.value) return
    const remember = localStorage.getItem(REMEMBER_KEY) === '1'
    persistSession(token.value, { ...user.value, ...patch }, remember)
  }

  const login = async (email: string, password: string, remember = false) => {
    isLoading.value = true
    try {
      const payload = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password, remember },
      })

      if (payload.status && payload.user) {
        const nextToken = authMode === 'token' ? payload.session?.token ?? null : null
        if (authMode === 'token' && !nextToken) {
          return {
            ok: false,
            message: 'No se recibio el token de sesion.',
            fieldErrors: payload.errors ?? {},
          }
        }
        persistSession(nextToken, payload.user, remember)
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

  const hydrateSession = async () => {
    if (hasHydrated.value || authMode !== 'cookie') return
    hasHydrated.value = true
    isHydrating.value = true
    try {
      const payload = await request<MeResponse>('/auth/me')
      const meUser = extractUser(payload)
      if (!meUser || payload.status === false) {
        clearSession()
        return
      }
      const remember = localStorage.getItem(REMEMBER_KEY) === '1'
      persistSession(null, meUser, remember)
    } catch {
      clearSession()
    } finally {
      isHydrating.value = false
    }
  }

  const refreshMe = async () => {
    if (authMode !== 'cookie') {
      return { ok: false as const, user: null as AuthUser | null }
    }

    try {
      const payload = await request<MeResponse>('/auth/me')
      const meUser = extractUser(payload)
      if (!meUser || payload.status === false) {
        clearSession()
        return { ok: false as const, user: null as AuthUser | null }
      }
      const remember = localStorage.getItem(REMEMBER_KEY) === '1'
      persistSession(null, meUser, remember)
      return { ok: true as const, user: meUser }
    } catch {
      clearSession()
      return { ok: false as const, user: null as AuthUser | null }
    }
  }

  const logout = async () => {
    isLoggingOut.value = true
    const currentToken = token.value
    clearSession()
    try {
      await request('/auth/logout', {
        method: 'POST',
        token: authMode === 'token' ? currentToken : null,
      })
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
    isHydrating,
    isAuthenticated,
    isMaster,
    isClient,
    hasClientPlan,
    hasActiveClientPlan,
    clientPlanStatus,
    clearSession,
    patchUser,
    login,
    logout,
    hydrateSession,
    refreshMe,
  }
})
