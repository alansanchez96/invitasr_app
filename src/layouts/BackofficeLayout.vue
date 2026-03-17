<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="backoffice-layout">
    <header class="bo-header">
      <div class="container bo-header-inner">
        <span class="bo-title">Backoffice InvitaSR</span>
      </div>
    </header>
    <main class="bo-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.backoffice-layout {
  min-height: 100vh;
  background: #f5f6fb;
}

.bo-header {
  background: #fff;
  border-bottom: 1px solid #e6e8f0;
  padding: 16px 0;
}

.bo-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bo-title {
  font-weight: 700;
  color: #2a2a2a;
}

.bo-main {
  padding: 32px 0 64px;
}
</style>
