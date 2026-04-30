<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()

const handleInactiveClient = async () => {
  await session.refreshMe()
  if (router.currentRoute.value.name !== 'client-inactive') {
    await router.replace({ name: 'client-inactive' })
  }
}

onMounted(() => {
  void session.hydrateSession()
  window.addEventListener('invitasr:client-inactive', handleInactiveClient)
})

onUnmounted(() => {
  window.removeEventListener('invitasr:client-inactive', handleInactiveClient)
})
</script>

<template>
  <RouterView />
</template>
