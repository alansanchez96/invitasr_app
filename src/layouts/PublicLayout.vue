<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import PublicNavbar from '@/components/public/PublicNavbar.vue'
import PublicFooter from '@/components/public/PublicFooter.vue'
import MobileCtaBar from '@/components/public/MobileCtaBar.vue'
import ToastStack from '@/components/ui/ToastStack.vue'
import { useSessionStore } from '@/stores/session'
import { isInvitationSubdomainHost } from '@/utils/host'

const session = useSessionStore()
const route = useRoute()
const isHomeRoute = computed(() => route.name === 'home')
const isInvitationHome = computed(() => isHomeRoute.value && isInvitationSubdomainHost())
const isPublicDemoInvitation = computed(() => route.name === 'public-demo-invitation')
const showAuthLoader = computed(() =>
  !isInvitationHome.value && !isPublicDemoInvitation.value && (session.isLoading || session.isLoggingOut || session.isHydrating),
)
const showNavbar = computed(() => !isInvitationHome.value && !isPublicDemoInvitation.value)
const showFooter = computed(() => {
  if (isInvitationHome.value || isPublicDemoInvitation.value) return false
  const hiddenFooterRoutes = new Set([
    'public-onboarding-flow',
    'public-onboarding',
    'template-preview',
  ])
  return !hiddenFooterRoutes.has(String(route.name ?? ''))
})
const showMobileCta = computed(() => !isInvitationHome.value && !isPublicDemoInvitation.value)
</script>

<template>
  <div class="public-layout" :class="{ 'is-home': isHomeRoute }">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <PublicNavbar v-if="showNavbar" />
    <main id="main-content" tabindex="-1" :class="{ 'with-mobile-cta': showMobileCta }">
      <RouterView />
    </main>
    <ToastStack />
    <MobileCtaBar v-if="showMobileCta" />
    <PublicFooter v-if="showFooter" />
    <div v-if="showAuthLoader" class="auth-loading-overlay" role="status" aria-live="polite">
      <span class="spinner auth-loading-spinner" aria-hidden="true"></span>
      <span class="sr-only">Cargando...</span>
    </div>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gradient-soft), var(--bg);
}

.public-layout.is-home {
  background:
    radial-gradient(circle at 8% 4%, rgba(102, 218, 188, 0.22), transparent 28%),
    radial-gradient(circle at 94% 24%, rgba(155, 107, 255, 0.22), transparent 30%),
    linear-gradient(180deg, #faf6ff 0%, #ffffff 100%);
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
  main.with-mobile-cta {
    padding-bottom: 120px;
  }
}
</style>
