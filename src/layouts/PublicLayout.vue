<script setup lang="ts">
import { RouterView } from 'vue-router'
import PublicNavbar from '@/components/public/PublicNavbar.vue'
import PublicFooter from '@/components/public/PublicFooter.vue'
import MobileCtaBar from '@/components/public/MobileCtaBar.vue'
</script>

<template>
  <div class="public-layout">
    <PublicNavbar />
    <main>
      <RouterView />
    </main>
    <MobileCtaBar />
    <PublicFooter />
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gradient-soft), var(--bg);
}

@media (max-width: 1010px) {
  main {
    padding-bottom: 120px;
  }
}
</style>
