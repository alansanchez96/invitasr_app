import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(null)
  const userName = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))

  const setSession = (newToken: string, name?: string) => {
    token.value = newToken
    userName.value = name ?? null
  }

  const clearSession = () => {
    token.value = null
    userName.value = null
  }

  return {
    token,
    userName,
    isAuthenticated,
    setSession,
    clearSession,
  }
})
