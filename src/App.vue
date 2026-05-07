<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const hasStoredUser = () =>
  Boolean(localStorage.getItem('user') || sessionStorage.getItem('user'))

const shouldHydrateInitialSession = () => {
  const route = router.currentRoute.value
  if (route.meta.requiresAuth) return true
  return hasStoredUser()
}

const handleInactiveClient = async () => {
  await session.refreshMe()
  if (router.currentRoute.value.name !== 'client-inactive') {
    await router.replace({ name: 'client-inactive' })
  }
}

onMounted(() => {
  if (shouldHydrateInitialSession()) {
    void session.hydrateSession()
  }
  window.addEventListener('invitasr:client-inactive', handleInactiveClient)
})

onUnmounted(() => {
  window.removeEventListener('invitasr:client-inactive', handleInactiveClient)
})
</script>

<template>
  <RouterView />
</template>
