<script setup lang="ts">
import { computed } from 'vue'
import HomePage from '@/pages/public/HomePage.vue'
import PublicInvitationPage from '@/pages/public/PublicInvitationPage.vue'
import { isInvitationSubdomainHost } from '@/utils/host'

const showInvitation = computed(() => isInvitationSubdomainHost())
</script>

<template>
  <PublicInvitationPage v-if="showInvitation" />
  <HomePage v-else />
</template>

