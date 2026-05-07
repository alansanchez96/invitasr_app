<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import HomePage from '@/pages/public/HomePage.vue'
import { isInvitationSubdomainHost } from '@/utils/host'

const showInvitation = computed(() => isInvitationSubdomainHost())
const PublicInvitationPage = defineAsyncComponent(() => import('@/pages/public/PublicInvitationPage.vue'))
</script>

<template>
  <PublicInvitationPage v-if="showInvitation" />
  <HomePage v-else />
</template>
