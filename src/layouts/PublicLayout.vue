<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import PublicNavbar from '@/components/public/PublicNavbar.vue'
import PublicFooter from '@/components/public/PublicFooter.vue'
import MobileCtaBar from '@/components/public/MobileCtaBar.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const showAuthLoader = computed(() => session.isLoading || session.isLoggingOut || session.isHydrating)
</script>

<template>
  <div class="public-layout">
    <PublicNavbar />
    <main>
      <RouterView />
    </main>
    <MobileCtaBar />
    <PublicFooter />
    <div v-if="showAuthLoader" class="auth-loading-overlay">
      <span class="spinner auth-loading-spinner" aria-hidden="true"></span>
    </div>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gradient-soft), var(--bg);
}

.auth-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: grid;
  place-items: center;
  background: rgba(245, 240, 255, 0.55);
  backdrop-filter: blur(4px);
}

.auth-loading-spinner {
  width: 44px;
  height: 44px;
  border-width: 3px;
  color: var(--brand-purple);
}

@media (max-width: 1010px) {
  main {
    padding-bottom: 120px;
  }
}
</style>
